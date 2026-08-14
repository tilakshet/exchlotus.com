import { Prisma } from "@prisma/client"
import { env } from "../../lib/env"
import { prisma } from "../../lib/prisma"
import { logger } from "../../lib/logger"
import { applyLedgerEntry } from "../wallet/wallet.service"
import { paymentGateway } from "./gateway/oro-gateway.client"

class PaymentError extends Error {}

export async function createDepositOrder(playerExternalId: string, amount: number) {
  const player = await prisma.player.findUnique({ where: { externalId: playerExternalId } })
  if (!player) {
    throw new PaymentError(`No player found for externalId ${playerExternalId}`)
  }
  if (!player.phone) {
    throw new PaymentError("A phone number is required on the account before depositing")
  }

  const order = await prisma.paymentOrder.create({
    data: { playerId: player.id, amount },
  })

  const result = await paymentGateway.createPayinOrder({
    orderId: order.id,
    amount,
    name: player.username,
    mobileNumber: player.phone,
    redirectUrl: `${env.PAYMENT_CALLBACK_BASE_URL}/dashboard/account/deposit?status=pending`,
  })

  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { gatewayTrxId: result.gatewayTrxId },
  })

  return { orderId: order.id, paymentUrl: result.paymentUrl, expiresAt: result.expiresAt.toISOString() }
}

/**
 * The gateway's PayIn callback carries no signature — undocumented by the
 * provider, unlike the (self-invented) HMAC scheme on gaming_webhook. The
 * strongest binding available without one: only ever act on an order_id WE
 * created, require its amount to match exactly, and treat it as consumed
 * the moment it's SUCCESS. An attacker would need to guess a live PaymentOrder
 * UUID (practically infeasible) to forge a credit, and even then only for
 * whatever amount that specific pending order was created for.
 *
 * Crediting the wallet BEFORE flipping the order to SUCCESS (not after) is
 * deliberate: applyLedgerEntry is itself idempotent (unique on
 * transactionId+type), so if the process dies between the two writes, a
 * retried callback safely replays instead of silently losing the credit or
 * double-crediting.
 */
export async function handlePayinCallback(payload: { order_id: string; amount: number; status: string }): Promise<void> {
  const order = await prisma.paymentOrder.findUnique({ where: { id: payload.order_id } })
  if (!order) {
    logger.warn({ orderId: payload.order_id }, "PayIn callback for unknown order_id — ignoring")
    return
  }
  if (order.status === "SUCCESS") {
    return
  }
  if (!order.amount.equals(new Prisma.Decimal(payload.amount))) {
    logger.error(
      { orderId: order.id, expected: order.amount.toNumber(), received: payload.amount },
      "PayIn callback amount mismatch — refusing to credit"
    )
    return
  }

  if (payload.status !== "success") {
    await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: "FAILED" } })
    return
  }

  const player = await prisma.player.findUnique({ where: { id: order.playerId } })
  if (!player) return

  await applyLedgerEntry({
    playerExternalId: player.externalId,
    type: "DEPOSIT",
    transactionId: `payin_${order.id}`,
    roundId: "payment",
    gameId: "wallet",
    amount: payload.amount,
  })

  await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: "SUCCESS" } })
}

/**
 * Correlates by gatewayTrxId (the `trxid` WE generated and sent on the
 * original payout request), matched against the callback's `cus_trx_id` —
 * same no-signature caveat as the PayIn callback above.
 */
export async function handlePayoutCallback(payload: { cus_trx_id: string; status: string; utr?: string | null }): Promise<void> {
  const request = await prisma.withdrawalRequest.findFirst({ where: { gatewayTrxId: payload.cus_trx_id } })
  if (!request) {
    logger.warn({ trxId: payload.cus_trx_id }, "Payout callback for unknown trx id — ignoring")
    return
  }
  if (request.status === "PAID" || request.status === "FAILED") {
    return
  }

  const nextStatus = payload.status === "success" ? "PAID" : payload.status === "pending" ? "PROCESSING" : "FAILED"
  await prisma.withdrawalRequest.update({
    where: { id: request.id },
    data: { status: nextStatus, gatewayUtr: payload.utr ?? request.gatewayUtr },
  })
}
