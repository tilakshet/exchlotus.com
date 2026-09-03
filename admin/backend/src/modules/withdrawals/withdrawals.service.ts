import { randomUUID } from "node:crypto"
import type { Request } from "express"
import { Prisma } from "../../generated/prisma"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"
import { createPayout, checkPayoutStatus } from "./gateway/oro-payout.client"

export interface ListWithdrawalsOptions {
  status?: string
  /** Matches username, phone, or the account holder name on the linked bank account. */
  search?: string
  dateFrom?: Date
  dateTo?: Date
  cursor?: string
  limit?: number
}

function buildWithdrawalsWhere(options: Omit<ListWithdrawalsOptions, "cursor" | "limit">): Prisma.WithdrawalRequestWhereInput {
  return {
    ...(options.status ? { status: options.status as never } : {}),
    ...(options.dateFrom || options.dateTo
      ? {
          requestedAt: {
            ...(options.dateFrom ? { gte: options.dateFrom } : {}),
            ...(options.dateTo ? { lte: options.dateTo } : {}),
          },
        }
      : {}),
    ...(options.search
      ? {
          OR: [
            { player: { username: { contains: options.search, mode: "insensitive" } } },
            { player: { phone: { contains: options.search } } },
            { bankAccount: { accountHolderName: { contains: options.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  }
}

export function countWithdrawals(options: Omit<ListWithdrawalsOptions, "cursor" | "limit">) {
  return prisma.withdrawalRequest.count({ where: buildWithdrawalsWhere(options) })
}

/**
 * Previously an unbounded findMany (no take/cursor at all) — fine while the
 * queue was small, but a genuine risk once withdrawal volume grows: same
 * cursor-pagination shape as users.service.ts/kyc.service.ts now, so a busy
 * period never returns thousands of rows in one response.
 */
export async function listWithdrawals(options: ListWithdrawalsOptions = {}) {
  const limit = Math.min(options.limit ?? 50, 100)
  const where = buildWithdrawalsWhere(options)

  const rows = await prisma.withdrawalRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { player: true, bankAccount: true },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((row) => ({
      id: row.id,
      playerId: row.playerId,
      username: row.player.username,
      amount: row.amount.toNumber(),
      status: row.status,
      bankAccount: {
        accountHolderName: row.bankAccount.accountHolderName,
        bankName: row.bankAccount.bankName,
        accountNumber: row.bankAccount.accountNumber,
        ifsc: row.bankAccount.ifsc,
      },
      gatewayUtr: row.gatewayUtr,
      reason: row.reason,
      requestedAt: row.requestedAt.toISOString(),
      decidedAt: row.decidedAt?.toISOString() ?? null,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

/**
 * Calls the real payout API. Releases the hold on the wallet (moves the
 * reserved amount from lockedBalance out of the wallet entirely — it's
 * actually left now) and writes the WITHDRAWAL ledger entry in the same
 * transaction as the audit log, mirroring wallets.service.ts adjustBalance
 * exactly for the same reason: this is the one place this table gets
 * mutated, and it must never happen unaudited.
 *
 * If the gateway call itself fails, nothing here has touched the database
 * yet — the request stays PENDING and can be retried.
 */
export async function approveWithdrawal(req: Request, id: string, actorAdminId: string) {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id },
    include: { bankAccount: true, player: true },
  })
  if (!request) throw new AdminApiError("NOT_FOUND", "Withdrawal request not found")
  if (request.status !== "PENDING") {
    throw new AdminApiError("WITHDRAWAL_NOT_PENDING", `Withdrawal is already ${request.status}`)
  }

  const trxId = `wd_${request.id}_${randomUUID().slice(0, 8)}`
  let payoutResult
  try {
    payoutResult = await createPayout({
      trxId,
      accountName: request.bankAccount.accountHolderName,
      accountNumber: request.bankAccount.accountNumber,
      ifsc: request.bankAccount.ifsc,
      amount: request.amount.toNumber(),
    })
  } catch (err) {
    throw new AdminApiError("GATEWAY_ERROR", err instanceof Error ? err.message : "Payout request failed")
  }

  const nextStatus = payoutResult.status === "success" ? "PAID" : "PROCESSING"

  return prisma.$transaction(async (tx) => {
    const walletRows = await tx.$queryRaw<{ id: string; balance: string; lockedBalance: string }[]>`
      SELECT id, balance, "lockedBalance" FROM wallets WHERE "playerId" = ${request.playerId} FOR UPDATE
    `
    const wallet = walletRows[0]
    if (!wallet) throw new AdminApiError("NOT_FOUND", "Wallet not provisioned for this player")

    const newLocked = new Prisma.Decimal(wallet.lockedBalance).minus(request.amount)
    await tx.wallet.update({ where: { id: wallet.id }, data: { lockedBalance: newLocked } })

    const entry = await tx.ledgerEntry.create({
      data: {
        playerId: request.playerId,
        type: "WITHDRAWAL",
        transactionId: trxId,
        roundId: "payout",
        gameId: "wallet",
        amount: request.amount.negated(),
        balanceAfter: new Prisma.Decimal(wallet.balance),
        actorAdminId,
      },
    })

    const updated = await tx.withdrawalRequest.update({
      where: { id: request.id },
      data: {
        status: nextStatus,
        gatewayTrxId: trxId,
        // Oro's own trx_id, distinct from the trxId we generated above —
        // needed later as `apiRefNum` for the Check Payout Status API
        // (reconcilePayoutStatus below), since that endpoint only accepts
        // their own id, not ours.
        oroTrxId: payoutResult.gatewayTrxId,
        gatewayUtr: payoutResult.utr,
        decidedByAdminId: actorAdminId,
        decidedAt: new Date(),
      },
    })

    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "withdrawal.approve",
      entityType: "WithdrawalRequest",
      entityId: request.id,
      before: { status: "PENDING" },
      after: { status: nextStatus, ledgerEntryId: entry.id, gatewayTrxId: trxId },
    })

    return { id: updated.id, status: updated.status, gatewayUtr: updated.gatewayUtr }
  })
}

/** Releases the hold back to balance — no ledger entry, since money never left the wallet. */
export async function rejectWithdrawal(req: Request, id: string, actorAdminId: string, reason: string) {
  const request = await prisma.withdrawalRequest.findUnique({ where: { id } })
  if (!request) throw new AdminApiError("NOT_FOUND", "Withdrawal request not found")
  if (request.status !== "PENDING") {
    throw new AdminApiError("WITHDRAWAL_NOT_PENDING", `Withdrawal is already ${request.status}`)
  }

  return prisma.$transaction(async (tx) => {
    const walletRows = await tx.$queryRaw<{ id: string; balance: string; lockedBalance: string }[]>`
      SELECT id, balance, "lockedBalance" FROM wallets WHERE "playerId" = ${request.playerId} FOR UPDATE
    `
    const wallet = walletRows[0]
    if (!wallet) throw new AdminApiError("NOT_FOUND", "Wallet not provisioned for this player")

    const newBalance = new Prisma.Decimal(wallet.balance).plus(request.amount)
    const newLocked = new Prisma.Decimal(wallet.lockedBalance).minus(request.amount)
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance, lockedBalance: newLocked } })

    const updated = await tx.withdrawalRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", reason, decidedByAdminId: actorAdminId, decidedAt: new Date() },
    })

    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "withdrawal.reject",
      entityType: "WithdrawalRequest",
      entityId: request.id,
      before: { status: "PENDING" },
      after: { status: "REJECTED" },
      reason,
    })

    return { id: updated.id, status: updated.status }
  })
}

/**
 * Fallback for a missed payout webhook (backend/'s
 * /api/payments/payout/callback never arriving) — polls Oro's official
 * Check Payout Status API instead of waiting indefinitely. Same idempotency
 * guard as handlePayoutCallback (backend/payments.service.ts): a request
 * already PAID or FAILED is never touched again, so calling this
 * repeatedly, or racing an actual webhook that arrives in between, can't
 * double-write or flip a terminal status back.
 */
export async function reconcilePayoutStatus(req: Request, id: string, actorAdminId: string) {
  const request = await prisma.withdrawalRequest.findUnique({ where: { id } })
  if (!request) throw new AdminApiError("NOT_FOUND", "Withdrawal request not found")
  if (request.status === "PAID" || request.status === "FAILED") {
    return { id: request.id, status: request.status, gatewayUtr: request.gatewayUtr }
  }
  if (!request.oroTrxId) {
    throw new AdminApiError("WITHDRAWAL_NOT_RECONCILABLE", "No gateway transaction id recorded for this withdrawal yet — it may not have been approved through the gateway.")
  }

  const result = await checkPayoutStatus(request.oroTrxId)
  const nextStatus = result.status === "success" ? "PAID" : result.status === "failed" ? "FAILED" : request.status

  if (nextStatus === request.status) {
    return { id: request.id, status: request.status, gatewayUtr: request.gatewayUtr }
  }

  return prisma.$transaction(async (tx) => {
    // updateMany (not update) so the where can include `status` as a guard —
    // if a real webhook raced this and already moved it to PAID/FAILED
    // between the read above and here, this becomes a no-op (count 0)
    // instead of overwriting a terminal status.
    const { count } = await tx.withdrawalRequest.updateMany({
      where: { id: request.id, status: request.status },
      data: { status: nextStatus, gatewayUtr: result.utr ?? request.gatewayUtr },
    })

    const current = await tx.withdrawalRequest.findUniqueOrThrow({ where: { id: request.id } })

    if (count > 0) {
      await writeAuditLog(tx, req, {
        adminId: actorAdminId,
        action: "withdrawal.reconcile",
        entityType: "WithdrawalRequest",
        entityId: request.id,
        before: { status: request.status },
        after: { status: current.status, gatewayUtr: current.gatewayUtr },
      })
    }

    return { id: current.id, status: current.status, gatewayUtr: current.gatewayUtr }
  })
}
