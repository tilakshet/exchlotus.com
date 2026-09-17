import { Prisma, type BonusTransactionType } from "@prisma/client"
import { prisma } from "../../lib/prisma"
import { appEvents } from "../../lib/events"
import {
  CONVERSION_COIN_THRESHOLD,
  CONVERSION_PAYOUT_RUPEES,
  COINS_PER_RUPEE,
  WELCOME_BONUS_COINS,
  getBonusRules,
} from "../../lib/bonusConfig"
import { BonusError } from "./bonus.errors"
import type { BonusTransactionEntry, BonusTransactionPage, BonusWalletSummary, ConvertCoinsResult } from "./bonus.types"

/**
 * The one place any bonus coin credit happens — generalized from what was
 * referral.service.ts's referral-only `creditBonus`. Same guarantee: the
 * unique constraint on BonusTransaction.reference (checked inside a
 * FOR UPDATE-locked transaction) is what actually prevents a double credit,
 * not the `findUnique` pre-check, which is only a fast path that avoids
 * taking the wallet lock at all for the common "already applied" case.
 */
export async function creditBonusCoins(
  playerId: string,
  coins: number,
  reference: string,
  meta: { referralId?: string; relatedDepositId?: string; type: BonusTransactionType; description: string; actorAdminId?: string }
): Promise<boolean> {
  if (coins <= 0) return false
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.bonusTransaction.findUnique({ where: { reference } })
      if (existing) return false

      const walletRows = await tx.$queryRaw<{ id: string; bonusCoinBalance: number }[]>`
        SELECT id, "bonusCoinBalance" FROM wallets WHERE "playerId" = ${playerId} FOR UPDATE
      `
      const wallet = walletRows[0]
      if (!wallet) throw new BonusError("WALLET_NOT_FOUND", `No wallet provisioned for player ${playerId}`)

      const before = wallet.bonusCoinBalance
      const after = before + coins
      await tx.wallet.update({ where: { id: wallet.id }, data: { bonusCoinBalance: after } })
      await tx.bonusTransaction.create({
        data: {
          playerId,
          referralId: meta.referralId ?? null,
          relatedDepositId: meta.relatedDepositId ?? null,
          type: meta.type,
          amount: new Prisma.Decimal(coins),
          currency: "COIN",
          balanceBefore: new Prisma.Decimal(before),
          balanceAfter: new Prisma.Decimal(after),
          reference,
          description: meta.description,
          actorAdminId: meta.actorAdminId ?? null,
        },
      })
      return true
    })
  } catch (err) {
    // Lost a race to a concurrent identical credit — the other request
    // already completed this exact idempotent movement. Not an error.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false
    throw err
  }
}

/**
 * Called once at account creation (auth.service.ts register()/verifyOtp()),
 * best-effort — a bonus-award bug must never block signup, same philosophy
 * as attributeReferral(). Idempotent via a fixed per-player reference, so
 * duplicate calls (retries, race between concurrent requests for the same
 * new account) never award it twice.
 */
export async function awardWelcomeBonus(playerId: string): Promise<boolean> {
  return creditBonusCoins(playerId, WELCOME_BONUS_COINS, `bonus:welcome:${playerId}`, {
    type: "WELCOME_BONUS",
    description: "Welcome bonus",
  })
}

export async function getBonusWallet(playerId: string): Promise<BonusWalletSummary> {
  const wallet = await prisma.wallet.findUnique({ where: { playerId }, select: { bonusCoinBalance: true, bonusPlayableBalance: true } })
  if (!wallet) throw new BonusError("WALLET_NOT_FOUND", `No wallet provisioned for player ${playerId}`)

  const coinBalance = wallet.bonusCoinBalance
  const eligibleForConversion = coinBalance >= CONVERSION_COIN_THRESHOLD
  return {
    coinBalance,
    coinsPerRupee: COINS_PER_RUPEE,
    convertibleRupeeValue: Math.floor(coinBalance / COINS_PER_RUPEE),
    eligibleForConversion,
    coinsUntilEligible: eligibleForConversion ? 0 : CONVERSION_COIN_THRESHOLD - coinBalance,
    playableBonusBalance: wallet.bonusPlayableBalance.toNumber(),
  }
}

export { getBonusRules }

export async function listBonusTransactions(playerId: string, options: { cursor?: string; limit?: number } = {}): Promise<BonusTransactionPage> {
  const limit = Math.min(options.limit ?? 20, 100)
  const rows = await prisma.bonusTransaction.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  const items: BonusTransactionEntry[] = page.map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount.toNumber(),
    currency: row.currency,
    balanceBefore: row.balanceBefore?.toNumber() ?? null,
    balanceAfter: row.balanceAfter?.toNumber() ?? null,
    status: row.status,
    description: row.description,
    referralId: row.referralId,
    relatedDepositId: row.relatedDepositId,
    createdAt: row.createdAt.toISOString(),
  }))

  return { items, nextCursor: hasMore ? page[page.length - 1].id : null }
}

/**
 * Converts exactly CONVERSION_COIN_THRESHOLD (50,000) bonus coins into
 * CONVERSION_PAYOUT_RUPEES (₹350) of PLAY-ONLY balance, atomically:
 *
 *  - One `$transaction`, not a call into wallet.service's applyLedgerEntry
 *    (which opens its own transaction and can't share this lock) — the
 *    wallet row is locked once (FOR UPDATE) and every field
 *    (bonusCoinBalance, balance, protectedPrincipal) is read/written inside
 *    that single lock, so a concurrent conversion attempt serializes on it
 *    rather than racing.
 *  - Idempotent per `reference` (bonus:conversion:{playerId}:{idempotencyKey})
 *    exactly like creditBonusCoins — a double-click/replay with the same
 *    key is a no-op, not a second conversion.
 *  - The ₹350 credit reuses wallet.service.applyLedgerEntry's exact
 *    protectedPrincipal logic (increment, floored at 0) instead of calling
 *    that function, so it participates in the SAME non-withdrawable-until-
 *    wagered mechanism deposits already use — no new wagering-requirement
 *    engine, no game/settlement code changes. A LedgerEntry row is written
 *    too (type ADJUSTMENT) so this shows up in the player's normal wallet
 *    transaction history exactly like any other balance credit.
 */
export async function convertCoins(playerId: string, idempotencyKey: string): Promise<ConvertCoinsResult> {
  const reference = `bonus:conversion:${playerId}:${idempotencyKey}`

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.bonusTransaction.findUnique({ where: { reference } })
      if (existing) {
        // Replay of an already-applied conversion — return the wallet's
        // current state rather than re-deriving from the stored row, since
        // balance/protectedPrincipal may have moved from later gameplay.
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { playerId } })
        return {
          conversionId: existing.id,
          coinsDebited: CONVERSION_COIN_THRESHOLD,
          rupeesCredited: CONVERSION_PAYOUT_RUPEES,
          coinBalance: wallet.bonusCoinBalance,
          balance: wallet.balance.toNumber(),
          protectedPrincipal: wallet.protectedPrincipal.toNumber(),
          playableBonusBalance: wallet.bonusPlayableBalance.toNumber(),
        }
      }

      const walletRows = await tx.$queryRaw<
        { id: string; bonusCoinBalance: number; balance: string; protectedPrincipal: string; bonusPlayableBalance: string }[]
      >`
        SELECT id, "bonusCoinBalance", balance, "protectedPrincipal", "bonusPlayableBalance" FROM wallets WHERE "playerId" = ${playerId} FOR UPDATE
      `
      const wallet = walletRows[0]
      if (!wallet) throw new BonusError("WALLET_NOT_FOUND", `No wallet provisioned for player ${playerId}`)

      if (wallet.bonusCoinBalance < CONVERSION_COIN_THRESHOLD) {
        throw new BonusError(
          "INSUFFICIENT_COINS",
          `Need ${CONVERSION_COIN_THRESHOLD} bonus coins to convert, have ${wallet.bonusCoinBalance}`
        )
      }

      const newCoinBalance = wallet.bonusCoinBalance - CONVERSION_COIN_THRESHOLD
      const currentBalance = new Prisma.Decimal(wallet.balance)
      const newBalance = currentBalance.plus(CONVERSION_PAYOUT_RUPEES)
      const newPrincipal = Prisma.Decimal.max(
        new Prisma.Decimal(0),
        new Prisma.Decimal(wallet.protectedPrincipal).plus(CONVERSION_PAYOUT_RUPEES)
      )
      // Display-only — see Wallet.bonusPlayableBalance's doc comment.
      const newPlayableBonus = new Prisma.Decimal(wallet.bonusPlayableBalance).plus(CONVERSION_PAYOUT_RUPEES)

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { bonusCoinBalance: newCoinBalance, balance: newBalance, protectedPrincipal: newPrincipal, bonusPlayableBalance: newPlayableBonus },
      })

      const conversion = await tx.bonusTransaction.create({
        data: {
          playerId,
          type: "BONUS_CONVERSION",
          amount: new Prisma.Decimal(-CONVERSION_COIN_THRESHOLD),
          currency: "COIN",
          balanceBefore: new Prisma.Decimal(wallet.bonusCoinBalance),
          balanceAfter: new Prisma.Decimal(newCoinBalance),
          reference,
          description: `Converted ${CONVERSION_COIN_THRESHOLD} bonus coins to ₹${CONVERSION_PAYOUT_RUPEES} playable balance`,
        },
      })

      await tx.ledgerEntry.create({
        data: {
          playerId,
          type: "ADJUSTMENT",
          transactionId: `bonus_conversion_${conversion.id}`,
          roundId: "bonus_conversion",
          gameId: "wallet",
          amount: new Prisma.Decimal(CONVERSION_PAYOUT_RUPEES),
          balanceAfter: newBalance,
        },
      })

      return {
        conversionId: conversion.id,
        coinsDebited: CONVERSION_COIN_THRESHOLD,
        rupeesCredited: CONVERSION_PAYOUT_RUPEES,
        coinBalance: newCoinBalance,
        balance: newBalance.toNumber(),
        protectedPrincipal: newPrincipal.toNumber(),
        playableBonusBalance: newPlayableBonus.toNumber(),
      }
    }).then(async (result) => {
      const player = await prisma.player.findUnique({ where: { id: playerId }, select: { externalId: true } })
      if (player) appEvents.emit("wallet:changed", { playerExternalId: player.externalId, balance: result.balance })
      return result
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Lost a race to a concurrent identical conversion request — retry
      // the lookup once, outside the failed transaction, to return the
      // winner's result instead of surfacing an error for a request that
      // was actually idempotent.
      const existing = await prisma.bonusTransaction.findUnique({ where: { reference } })
      const wallet = await prisma.wallet.findUnique({ where: { playerId } })
      if (existing && wallet) {
        return {
          conversionId: existing.id,
          coinsDebited: CONVERSION_COIN_THRESHOLD,
          rupeesCredited: CONVERSION_PAYOUT_RUPEES,
          coinBalance: wallet.bonusCoinBalance,
          balance: wallet.balance.toNumber(),
          protectedPrincipal: wallet.protectedPrincipal.toNumber(),
          playableBonusBalance: wallet.bonusPlayableBalance.toNumber(),
        }
      }
    }
    throw err
  }
}
