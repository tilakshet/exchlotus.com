import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { runCsvExport } from "../../lib/export"
import { countBankAccounts, listBankAccounts } from "./bank-accounts.service"

export const bankAccountsRouter = Router()
bankAccountsRouter.use(requireAdminAuth)

const listQuerySchema = z.object({
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

bankAccountsRouter.get("/", requirePermission("bank-accounts.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listBankAccounts(parsed.data))
})

bankAccountsRouter.get("/export", requirePermission("bank-accounts.export"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  const filters = { search: parsed.data.search, cursor: undefined, limit: undefined }

  await runCsvExport(req, res, {
    actorAdminId: req.adminAuth!.id,
    module: "bank-accounts",
    filename: `bank-accounts-export-${new Date().toISOString().slice(0, 10)}.csv`,
    header: ["Account ID", "Player", "Account Holder", "Bank", "Account Number", "IFSC", "Shared With Other Players", "Added"],
    countRows: () => countBankAccounts(filters),
    fetchPage: (cursor, limit) => listBankAccounts({ ...filters, cursor, limit }),
    toRow: (item) => [item.id, item.player.username, item.accountHolderName, item.bankName, item.accountNumber, item.ifsc, item.sharedWithOtherPlayers ? "Yes" : "No", item.createdAt],
    filtersForAudit: filters,
  })
})
