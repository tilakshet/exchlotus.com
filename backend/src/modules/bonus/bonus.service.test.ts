import { randomUUID } from "node:crypto"
import { afterEach, describe, expect, it } from "vitest"
import { prisma } from "../../lib/prisma"
import { CONVERSION_COIN_THRESHOLD, CONVERSION_PAYOUT_RUPEES, WELCOME_BONUS_COINS } from "../../lib/bonusConfig"
import { applyLedgerEntry } from "../wallet/wallet.service"
import { awardWelcomeBonus, convertCoins, creditBonusCoins } from "./bonus.service"
import { BonusError } from "./bonus.errors"

async function createPlayer(overrides: { bonusCoinBalance?: number; balance?: number } = {}) {
  const externalId = randomUUID()
  return prisma.player.create({
    data: {
      externalId,
      username: `bonus-test-${externalId.slice(0, 8)}`,
      status: "ACTIVE",
      wallet: { create: { balance: overrides.balance ?? 0, bonusCoinBalance: overrides.bonusCoinBalance ?? 0, currency: "INR" } },
    },
  })
}

describe("bonus.service", () => {
  const createdPlayerIds: string[] = []

  afterEach(async () => {
    const ids = createdPlayerIds.splice(0)
    await prisma.bonusTransaction.deleteMany({ where: { playerId: { in: ids } } })
    await prisma.ledgerEntry.deleteMany({ where: { playerId: { in: ids } } })
    await prisma.wallet.deleteMany({ where: { playerId: { in: ids } } })
    await prisma.player.deleteMany({ where: { id: { in: ids } } })
  })

  async function makePlayer(overrides: { bonusCoinBalance?: number; balance?: number } = {}) {
    const player = await createPlayer(overrides)
    createdPlayerIds.push(player.id)
    return player
  }

  it("awards the welcome bonus exactly once, even under sequential duplicate calls", async () => {
    const player = await makePlayer()

    await awardWelcomeBonus(player.id)
    await awardWelcomeBonus(player.id)

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: player.id } })
    expect(wallet.bonusCoinBalance).toBe(WELCOME_BONUS_COINS)

    const rows = await prisma.bonusTransaction.findMany({ where: { playerId: player.id, type: "WELCOME_BONUS" } })
    expect(rows).toHaveLength(1)
  })

  it("awards the welcome bonus exactly once under a concurrent duplicate call", async () => {
    const player = await makePlayer()

    await Promise.all([awardWelcomeBonus(player.id), awardWelcomeBonus(player.id)])

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: player.id } })
    expect(wallet.bonusCoinBalance).toBe(WELCOME_BONUS_COINS)
  })

  it("creditBonusCoins is idempotent per reference regardless of caller", async () => {
    const player = await makePlayer()
    const reference = `test:${randomUUID()}`

    const first = await creditBonusCoins(player.id, 1234, reference, { type: "BONUS_ADJUSTMENT", description: "test" })
    const second = await creditBonusCoins(player.id, 1234, reference, { type: "BONUS_ADJUSTMENT", description: "test" })

    expect(first).toBe(true)
    expect(second).toBe(false)

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: player.id } })
    expect(wallet.bonusCoinBalance).toBe(1234)
  })

  it("converts exactly 50,000 coins into the fixed playable-rupee payout, atomically", async () => {
    const player = await makePlayer({ bonusCoinBalance: CONVERSION_COIN_THRESHOLD, balance: 0 })

    const result = await convertCoins(player.id, randomUUID())

    expect(result.coinsDebited).toBe(CONVERSION_COIN_THRESHOLD)
    expect(result.rupeesCredited).toBe(CONVERSION_PAYOUT_RUPEES)
    expect(result.coinBalance).toBe(0)
    expect(result.balance).toBe(CONVERSION_PAYOUT_RUPEES)
    // The converted principal is folded into protectedPrincipal — the same
    // mechanism deposits use to stay non-withdrawable until wagered — not a
    // new wagering engine (see wallet.service.ts applyLedgerEntry).
    expect(result.protectedPrincipal).toBe(CONVERSION_PAYOUT_RUPEES)
    // Display-only mirror for the Bonus page's "Playable Bonus Balance" — see
    // Wallet.bonusPlayableBalance's doc comment.
    expect(result.playableBonusBalance).toBe(CONVERSION_PAYOUT_RUPEES)

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: player.id } })
    expect(wallet.bonusCoinBalance).toBe(0)
    expect(wallet.balance.toNumber()).toBe(CONVERSION_PAYOUT_RUPEES)
    expect(wallet.protectedPrincipal.toNumber()).toBe(CONVERSION_PAYOUT_RUPEES)
    expect(wallet.bonusPlayableBalance.toNumber()).toBe(CONVERSION_PAYOUT_RUPEES)

    const ledgerRow = await prisma.ledgerEntry.findFirst({ where: { playerId: player.id, type: "ADJUSTMENT" } })
    expect(ledgerRow?.amount.toNumber()).toBe(CONVERSION_PAYOUT_RUPEES)
  })

  it("rejects conversion below the 50,000-coin threshold", async () => {
    const player = await makePlayer({ bonusCoinBalance: CONVERSION_COIN_THRESHOLD - 1 })

    await expect(convertCoins(player.id, randomUUID())).rejects.toThrow(BonusError)

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: player.id } })
    expect(wallet.bonusCoinBalance).toBe(CONVERSION_COIN_THRESHOLD - 1)
    expect(wallet.balance.toNumber()).toBe(0)
  })

  it("a replayed conversion with the same idempotency key does not deduct coins twice", async () => {
    const player = await makePlayer({ bonusCoinBalance: CONVERSION_COIN_THRESHOLD })
    const idempotencyKey = randomUUID()

    const first = await convertCoins(player.id, idempotencyKey)
    const second = await convertCoins(player.id, idempotencyKey)

    expect(second.conversionId).toBe(first.conversionId)

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: player.id } })
    expect(wallet.bonusCoinBalance).toBe(0)
    expect(wallet.balance.toNumber()).toBe(CONVERSION_PAYOUT_RUPEES)
  })

  it("concurrent conversion requests with only one 50,000-coin chunk available only succeed once", async () => {
    const player = await makePlayer({ bonusCoinBalance: CONVERSION_COIN_THRESHOLD })

    const results = await Promise.allSettled([convertCoins(player.id, randomUUID()), convertCoins(player.id, randomUUID())])
    const fulfilled = results.filter((r) => r.status === "fulfilled")
    const rejected = results.filter((r) => r.status === "rejected")

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: player.id } })
    expect(wallet.bonusCoinBalance).toBe(0)
    expect(wallet.balance.toNumber()).toBe(CONVERSION_PAYOUT_RUPEES)
  })

  it("wagering the converted playable bonus draws down bonusPlayableBalance, but a subsequent win stays fully withdrawable", async () => {
    const player = await makePlayer({ bonusCoinBalance: CONVERSION_COIN_THRESHOLD, balance: 0 })
    await convertCoins(player.id, randomUUID()) // balance=350, protectedPrincipal=350, bonusPlayableBalance=350

    await applyLedgerEntry({
      playerExternalId: player.externalId,
      type: "BET",
      transactionId: randomUUID(),
      roundId: "test",
      gameId: "test",
      amount: -100,
    })
    let wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: player.id } })
    expect(wallet.bonusPlayableBalance.toNumber()).toBe(CONVERSION_PAYOUT_RUPEES - 100) // 250 — spent from bonus play money

    await applyLedgerEntry({
      playerExternalId: player.externalId,
      type: "WIN",
      transactionId: randomUUID(),
      roundId: "test",
      gameId: "test",
      amount: 500,
    })
    wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: player.id } })
    // WIN never touches protectedPrincipal/bonusPlayableBalance — the payout
    // lands purely as balance, which is exactly what makes it withdrawable.
    expect(wallet.balance.toNumber()).toBe(CONVERSION_PAYOUT_RUPEES - 100 + 500) // 750
    expect(wallet.protectedPrincipal.toNumber()).toBe(CONVERSION_PAYOUT_RUPEES - 100) // 250 — bonus principal not yet wagered stays protected
    expect(wallet.bonusPlayableBalance.toNumber()).toBe(CONVERSION_PAYOUT_RUPEES - 100) // 250 — unchanged by WIN
  })
})
