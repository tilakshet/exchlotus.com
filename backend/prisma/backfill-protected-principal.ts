import { Prisma } from "@prisma/client"
import { prisma } from "../src/lib/prisma"

/**
 * One-time backfill for Wallet.protectedPrincipal (see its doc comment in
 * schema.prisma and wallet.service.ts applyLedgerEntry). The column
 * defaults to 0 for every existing wallet on migration day, which is wrong
 * for any account with real history — this replays each wallet's
 * DEPOSIT/BET/REFUND/ADJUSTMENT ledger entries in chronological order,
 * clamping the running total at 0 after every single entry (NOT summing
 * everything then flooring once — that's the bug this column exists to
 * fix), and persists the result. Safe to re-run: it always recomputes from
 * the full ledger history rather than incrementing, so running it twice
 * produces the same answer.
 *
 * Run once, during a low-traffic window, after the migration that adds the
 * column has been applied:
 *   npx tsx prisma/backfill-protected-principal.ts
 */
async function main() {
  const BATCH_SIZE = 200
  let cursor: string | undefined
  let processed = 0

  for (;;) {
    const wallets = await prisma.wallet.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      select: { id: true, playerId: true },
    })
    if (wallets.length === 0) break

    for (const wallet of wallets) {
      await prisma.$transaction(async (tx) => {
        // FOR UPDATE: a concurrent bet/deposit for this exact player mid-backfill
        // serializes behind this transaction rather than racing it, same lock
        // discipline as applyLedgerEntry/requestWithdrawal.
        await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`

        const entries = await tx.ledgerEntry.findMany({
          where: { playerId: wallet.playerId, type: { in: ["DEPOSIT", "BET", "REFUND", "ADJUSTMENT"] } },
          orderBy: { createdAt: "asc" },
          select: { amount: true },
        })

        let principal = new Prisma.Decimal(0)
        for (const entry of entries) {
          principal = Prisma.Decimal.max(new Prisma.Decimal(0), principal.plus(entry.amount))
        }

        await tx.wallet.update({ where: { id: wallet.id }, data: { protectedPrincipal: principal } })
      })
      processed++
    }

    cursor = wallets[wallets.length - 1].id
    console.log(`Backfilled ${processed} wallet(s)...`)
  }

  console.log(`Done — backfilled protectedPrincipal for ${processed} wallet(s).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
