import { prisma } from "../../lib/prisma"
import { checkOtpCode, requestOtp } from "../auth/auth.service"

export class KycError extends Error {
  constructor(
    public readonly code: "ALREADY_APPROVED" | "ALREADY_PENDING" | "PHONE_NOT_VERIFIED" | "NO_PHONE_ON_FILE" | "PAN_ALREADY_USED",
    message: string
  ) {
    super(message)
  }
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
        }
      : null,
  }
}
