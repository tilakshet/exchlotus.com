import type { Request } from "express"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"
import type { KycStatus, Prisma } from "../../generated/prisma"

export interface ListKycOptions {
  status?: KycStatus
  cursor?: string
  limit?: number
}

export async function listKycSubmissions(options: ListKycOptions) {
  const limit = Math.min(options.limit ?? 25, 100)

  const where: Prisma.KycSubmissionWhereInput = options.status ? { status: options.status } : {}

  const rows = await prisma.kycSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { player: { select: { id: true, username: true, phone: true, externalId: true } } },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((row) => ({
      id: row.id,
      player: { id: row.player.id, username: row.player.username, phone: row.player.phone, externalId: row.player.externalId },
      panNumber: row.panNumber,
      status: row.status,
      rejectionReason: row.rejectionReason,
      submittedAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

export async function getKycSubmission(id: string) {
  const submission = await prisma.kycSubmission.findUnique({
    where: { id },
    include: { player: { select: { id: true, username: true, phone: true, externalId: true, status: true, phoneVerifiedAt: true } } },
  })
  if (!submission) throw new AdminApiError("NOT_FOUND", "KYC submission not found")
  return {
    ...submission,
    player: { ...submission.player, phoneVerified: submission.player.phoneVerifiedAt !== null },
  }
}

/**
 * Updates the submission AND Player.kycStatus together — same "one write,
 * never out of sync" reasoning as the player backend's submitKyc. The
 * withdrawal gate (backend's wallet.service.ts requestWithdrawal) reads only
 * Player.kycStatus, so this is the one place that column is ever changed
 * post-submission.
 */
export async function reviewKycSubmission(
  req: Request,
  actorAdminId: string,
  id: string,
  decision: "APPROVED" | "REJECTED",
  reason?: string
) {
  const submission = await prisma.kycSubmission.findUnique({ where: { id } })
  if (!submission) throw new AdminApiError("NOT_FOUND", "KYC submission not found")
  if (submission.status !== "PENDING") {
    throw new AdminApiError("KYC_NOT_PENDING", `This submission is already ${submission.status}`)
  }
  if (decision === "REJECTED" && !reason?.trim()) {
    throw new AdminApiError("REASON_REQUIRED", "A reason is required when rejecting a KYC submission")
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.kycSubmission.update({
      where: { id },
      data: {
        status: decision,
        rejectionReason: decision === "REJECTED" ? reason : null,
        reviewedByAdminId: actorAdminId,
        reviewedAt: new Date(),
      },
    })
    await tx.player.update({ where: { id: submission.playerId }, data: { kycStatus: decision } })

    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: decision === "APPROVED" ? "kyc.approve" : "kyc.reject",
      entityType: "KycSubmission",
      entityId: id,
      before: { status: "PENDING" },
      after: { status: decision },
      reason,
    })

    return { id: updated.id, status: updated.status }
  })
}
