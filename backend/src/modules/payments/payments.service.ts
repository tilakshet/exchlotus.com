import { Prisma } from "@prisma/client"
import { env } from "../../lib/env"
import { prisma } from "../../lib/prisma"
import { logger } from "../../lib/logger"
import { applyLedgerEntry } from "../wallet/wallet.service"
import { evaluateQualificationForPlayer } from "../referral/referral.service"
// Active PayIn gateway. Temporarily reverted to Oro (2026-08-29) — Cashfree
// needs domain whitelisting approved (merchant.cashfree.com > Developers >
// Whitelisting) before its hosted checkout will accept exchlotus.com;
// that's a Cashfree-side approval wait, not a code issue. Cashfree's client
// (./gateway/cashfree-gateway.client) is left fully intact — swap this
// import back once whitelisting is approved.
import { paymentGateway } from "./gateway/oro-gateway.client"

class PaymentError extends Error {}

// NPCI mandates (effective Feb 2025) that a UPI transaction id be ≤35
// alphanumeric characters, no special characters — our PaymentOrder.id is a
// hyphenated UUID (36 chars), which gets silently rejected at the bank/NPCI
// switch when passed through as the transaction reference, well after the
// gateway's own create-order call has already succeeded (that's why the
// order still gets created on Oro's side, but never receives a UTR). Since
// stripping a UUID's hyphens is reversible (fixed 8-4-4-4-12 grouping), no
// extra column is needed — this is the only id ever sent to a gateway as
// `order_id`, and reversed back to look up the row when its callback lands.
function toGatewayOrderId(id: string): string {
  return id.replace(/-/g, "")
}
function fromGatewayOrderId(gatewayOrderId: string): string {
  return `${gatewayOrderId.slice(0, 8)}-${gatewayOrderId.slice(8, 12)}-${gatewayOrderId.slice(12, 16)}-${gatewayOrderId.slice(16, 20)}-${gatewayOrderId.slice(20, 32)}`
}

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

  // If the gateway call fails, the PaymentOrder row above already exists —
  // without this, it stays orphaned at PENDING forever, indistinguishable
  // from an order still genuinely awaiting payment (see the admin
  // Payment Attempts page, whose whole purpose is spotting exactly this).
  let result
  try {
    result = await paymentGateway.createPayinOrder({
      orderId: toGatewayOrderId(order.id),
      amount,
      name: player.username,
      mobileNumber: player.phone,
      redirectUrl: `${env.PAYMENT_CALLBACK_BASE_URL}/dashboard/account/deposit?status=pending`,
    })
  } catch (err) {
    await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: "FAILED" } })
    throw err
  }

  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { gatewayTrxId: result.gatewayTrxId },
  })

  return {
    orderId: order.id,
    paymentUrl: result.paymentUrl,
    paymentSessionId: result.paymentSessionId,
    cashfreeMode: result.cashfreeMode,
    expiresAt: result.expiresAt.toISOString(),
  }
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
  // Falls back to the raw order_id for any order created before this
  // gateway-order-id change deployed — it was sent to the gateway as a raw
  // UUID, so its callback echoes that back rather than the stripped form
  // fromGatewayOrderId expects. Safe to remove once nothing pre-dating the
  // change is still in flight.
  const order =
    (await prisma.paymentOrder.findUnique({ where: { id: fromGatewayOrderId(payload.order_id) } })) ??
    (await prisma.paymentOrder.findUnique({ where: { id: payload.order_id } }))
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

  // Best-effort, after the deposit is fully committed — a referral
  // qualification-check bug must never affect the deposit itself. No-op
  // for a player with no pending referral (see evaluateQualificationForPlayer).
  evaluateQualificationForPlayer(player.id).catch((err) => {
    logger.error({ err, playerId: player.id }, "Referral qualification check failed after deposit")
  })
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
