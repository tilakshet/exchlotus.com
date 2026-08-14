import { prisma } from "../../lib/prisma"

export interface AddBankAccountInput {
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifsc: string
}

export async function listBankAccounts(playerExternalId: string) {
  const player = await prisma.player.findUnique({ where: { externalId: playerExternalId } })
  if (!player) return []
  return prisma.bankAccount.findMany({ where: { playerId: player.id }, orderBy: { createdAt: "desc" } })
}

export async function addBankAccount(playerExternalId: string, input: AddBankAccountInput) {
  const player = await prisma.player.findUniqueOrThrow({ where: { externalId: playerExternalId } })
  return prisma.bankAccount.create({ data: { playerId: player.id, ...input } })
}

/** Scoped to the caller's own accounts — deleteMany with both id and playerId in the where clause means a foreign id just matches zero rows, never someone else's. */
export async function removeBankAccount(playerExternalId: string, bankAccountId: string): Promise<boolean> {
  const player = await prisma.player.findUnique({ where: { externalId: playerExternalId } })
  if (!player) return false
  const result = await prisma.bankAccount.deleteMany({ where: { id: bankAccountId, playerId: player.id } })
  return result.count > 0
}
