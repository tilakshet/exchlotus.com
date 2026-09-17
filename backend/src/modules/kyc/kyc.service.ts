import { prisma } from "../../lib/prisma"
import { checkOtpCode, requestOtp } from "../auth/auth.service"
import { QrxPanError, verifyPanWithQrx } from "./qrx-pan.service"

export class KycError extends Error {
  constructor(
    public readonly code:
      | "ALREADY_APPROVED"
      | "ALREADY_PENDING"
      | "PHONE_NOT_VERIFIED"
      | "NO_PHONE_ON_FILE"
      | "PAN_ALREADY_USED"
      | "PAN_INVALID"
      | "PAN_NOT_VERIFIED"
      | "QRX_UNAVAILABLE"
      | "QRX_INVALID_RESPONSE",
    message: string
  ) {
    super(message)
  }
}

function parseProviderDate(value: string | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Sends an OTP to the authenticated player's own phone (reuses
 * auth.service.ts's requestOtp — same rate limiting/cooldown, no separate
 * copy of that logic) — the confirm-phone step KYC needs for accounts that
 * signed up with a password and never verified their number via OTP at all.
 */
export async function requestPhoneVerificationOtp(playerId: string) {
  const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } })
  if (!player.phone) {
    throw new KycError("NO_PHONE_ON_FILE", "No phone number is on file for this account")
  }
  return requestOtp(player.phone)
}

export async function confirmPhoneVerificationOtp(playerId: string, code: string) {
  const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } })
  if (!player.phone) {
    throw new KycError("NO_PHONE_ON_FILE", "No phone number is on file for this account")
  }
  // checkOtpCode throws AuthError("OTP_INVALID", ...) on failure — let that
  // propagate as-is rather than re-wrapping it, the controller already
  // knows how to translate AuthError.
  await checkOtpCode(player.phone, code)
  await prisma.player.update({ where: { id: playerId }, data: { phoneVerifiedAt: new Date() } })
}

/**
 * A NOT_SUBMITTED or REJECTED player can (re)submit; APPROVED never needs
 * to, and PENDING already has one under review — creating another would
 * just be noise for whoever reviews it next. Player.kycStatus is updated in
 * the same transaction as the new submission row so the withdrawal gate
 * (wallet.service.ts requestWithdrawal) is never out of sync with it.
 */
export async function submitKyc(
  playerId: string,
  input: { panNumber: string; panCardFile: string; photoFile: string }
) {
  const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } })

  if (player.kycStatus === "APPROVED") {
    throw new KycError("ALREADY_APPROVED", "This account is already KYC-verified")
  }
  if (player.kycStatus === "PENDING") {
    throw new KycError("ALREADY_PENDING", "A submission is already under review")
  }
  // A PAN card is proof of identity, not proof of *this* phone number — a
  // password-signup account never went through OTP, so this can otherwise
  // be entirely skipped (see requestPhoneVerificationOtp/confirmPhoneVerificationOtp above).
  if (!player.phoneVerifiedAt) {
    throw new KycError("PHONE_NOT_VERIFIED", "Verify your mobile number before submitting KYC documents")
  }

  // The same real-world PAN identifies one person — letting it verify
  // multiple player accounts would defeat the point of requiring it (a
  // player could open unlimited accounts, e.g. to farm signup bonuses or
  // dodge a suspension, and still pass "identity verification" on every
  // one of them). PENDING is included, not just APPROVED, so two accounts
  // can't race two submissions of the same PAN and have both approved
  // before either review catches it.
  const existingUseOfPan = await prisma.kycSubmission.findFirst({
    where: { panNumber: input.panNumber, status: { in: ["APPROVED", "PENDING"] }, playerId: { not: playerId } },
  })
  if (existingUseOfPan) {
    throw new KycError("PAN_ALREADY_USED", "This PAN number is already associated with another account")
  }

  return prisma.$transaction(async (tx) => {
    const submission = await tx.kycSubmission.create({
      data: {
        playerId,
        panNumber: input.panNumber,
        panCardFile: input.panCardFile,
        photoFile: input.photoFile,
      },
    })
    await tx.player.update({ where: { id: playerId }, data: { kycStatus: "PENDING" } })
    return submission
  })
}

export async function verifyPan(playerId: string, panNumber: string) {
  const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } })

  if (player.kycStatus === "APPROVED") {
    const existing = await prisma.kycSubmission.findFirst({ where: { playerId, status: "APPROVED" }, orderBy: { createdAt: "desc" } })
    return {
      success: true,
      message: "PAN is already verified",
      kycStatus: "APPROVED" as const,
      data: existing
        ? {
            pan: existing.panNumber,
            fullname: existing.fullName,
            panType: existing.panType,
            gender: existing.gender,
            dob: existing.dateOfBirth?.toISOString().slice(0, 10) ?? null,
            aadhaarLinked: existing.aadhaarLinked,
            verificationSource: existing.verificationSource,
          }
        : null,
    }
  }
  if (!player.phoneVerifiedAt) {
    throw new KycError("PHONE_NOT_VERIFIED", "Verify your mobile number before verifying PAN")
  }

  const existingUseOfPan = await prisma.kycSubmission.findFirst({
    where: { panNumber, status: "APPROVED", playerId: { not: playerId } },
  })
  if (existingUseOfPan) throw new KycError("PAN_ALREADY_USED", "This PAN number is already verified on another account")

  let result
  try {
    result = await verifyPanWithQrx(panNumber)
  } catch (err) {
    if (err instanceof QrxPanError) {
      if (err.code === "NOT_VERIFIED") throw new KycError("PAN_NOT_VERIFIED", "PAN verification failed. Please check the PAN number and try again.")
      if (err.code === "INVALID_RESPONSE") throw new KycError("QRX_INVALID_RESPONSE", "PAN verification service returned an invalid response")
      throw new KycError("QRX_UNAVAILABLE", "PAN verification service is temporarily unavailable. Please try again later.")
    }
    throw err
  }

  if (result.details.pan.toUpperCase() !== panNumber) {
    throw new KycError("QRX_INVALID_RESPONSE", "PAN verification service returned mismatched data")
  }

  const details = result.details
  try {
    const submission = await prisma.$transaction(async (tx) => {
      const approvedUse = await tx.kycSubmission.findFirst({
        where: { panNumber, status: "APPROVED", playerId: { not: playerId } },
        select: { id: true },
      })
      if (approvedUse) throw new KycError("PAN_ALREADY_USED", "This PAN number is already verified on another account")

      const created = await tx.kycSubmission.create({
        data: {
          playerId,
          panNumber,
          panType: details.pan_type ?? null,
          fullName: details.fullname ?? null,
          firstName: details.first_name ?? null,
          middleName: details.middle_name ?? null,
          lastName: details.last_name ?? null,
          gender: details.gender ?? null,
          aadhaarNumber: details.aadhaar_number ?? null,
          aadhaarLinked: details.aadhaar_linked ?? null,
          dateOfBirth: parseProviderDate(details.dob),
          buildingName: details.address?.building_name ?? null,
          locality: details.address?.locality ?? null,
          streetName: details.address?.street_name ?? null,
          pincode: details.address?.pincode ?? null,
          city: details.address?.city ?? null,
          state: details.address?.state ?? null,
          country: details.address?.country ?? null,
          mobile: details.mobile ?? null,
          email: details.email ?? null,
          status: "APPROVED",
          verificationSource: "QRX_PAN_API",
          provider: "QRX",
          providerRequestId: result.requestId,
          verifiedAt: new Date(),
        },
      })
      await tx.player.update({ where: { id: playerId }, data: { kycStatus: "APPROVED" } })
      return created
    })

    return {
      success: true,
      message: "PAN verified successfully",
      kycStatus: "APPROVED" as const,
      data: {
        pan: submission.panNumber,
        fullname: submission.fullName,
        panType: submission.panType,
        gender: submission.gender,
        dob: submission.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        aadhaarLinked: submission.aadhaarLinked,
        verificationSource: submission.verificationSource,
      },
    }
  } catch (err) {
    if (err instanceof KycError) throw err
    if ((err as { code?: string })?.code === "P2002") {
      const existing = await prisma.kycSubmission.findFirst({ where: { playerId, status: "APPROVED" }, orderBy: { createdAt: "desc" } })
      if (existing) {
        return {
          success: true,
          message: "PAN is already verified",
          kycStatus: "APPROVED" as const,
          data: {
            pan: existing.panNumber,
            fullname: existing.fullName,
            panType: existing.panType,
            gender: existing.gender,
            dob: existing.dateOfBirth?.toISOString().slice(0, 10) ?? null,
            aadhaarLinked: existing.aadhaarLinked,
            verificationSource: existing.verificationSource,
          },
        }
      }
      throw new KycError("PAN_ALREADY_USED", "This PAN number is already verified on another account")
    }
    throw err
  }
}

export async function getMyKyc(playerId: string) {
  const [player, latest] = await Promise.all([
    prisma.player.findUniqueOrThrow({ where: { id: playerId }, select: { kycStatus: true, phoneVerifiedAt: true } }),
    prisma.kycSubmission.findFirst({ where: { playerId }, orderBy: { createdAt: "desc" } }),
  ])

  return {
    status: player.kycStatus,
    phoneVerified: player.phoneVerifiedAt !== null,
    latestSubmission: latest
      ? {
          submittedAt: latest.createdAt.toISOString(),
          reviewedAt: latest.reviewedAt?.toISOString() ?? null,
          rejectionReason: latest.rejectionReason,
          pan: latest.panNumber,
          fullName: latest.fullName,
          panType: latest.panType,
          gender: latest.gender,
          dateOfBirth: latest.dateOfBirth?.toISOString().slice(0, 10) ?? null,
          aadhaarLinked: latest.aadhaarLinked,
          verificationSource: latest.verificationSource,
        }
      : null,
  }
}
