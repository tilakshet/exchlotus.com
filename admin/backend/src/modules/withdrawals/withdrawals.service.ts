import { randomUUID } from "node:crypto"
import type { Request } from "express"
import { Prisma } from "../../generated/prisma"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"
import { createPayout } from "./gateway/oro-payout.client"

export async function listWithdrawals(status?: string) {
  const rows = await prisma.withdrawalRequest.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { requestedAt: "desc" },
    include: { player: true, bankAccount: true },
  })

  return rows.map((row) => ({
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
  }))
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
