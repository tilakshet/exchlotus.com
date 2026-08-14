import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../auth/auth.middleware"
import { addBankAccount, listBankAccounts, removeBankAccount } from "./bank-accounts.service"

export const bankAccountsRouter = Router()
bankAccountsRouter.use(requireAuth)

bankAccountsRouter.get("/", async (req, res) => {
  const accounts = await listBankAccounts(req.auth!.externalId)
  res.json(accounts)
})

const addBankAccountSchema = z.object({
  accountHolderName: z.string().min(2).max(100),
  bankName: z.string().min(2).max(100),
  accountNumber: z.string().regex(/^\d{9,18}$/, "Enter a valid account number"),
  ifsc: z
    .string()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code")),
})

bankAccountsRouter.post("/", async (req, res) => {
  const parsed = addBankAccountSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  const account = await addBankAccount(req.auth!.externalId, parsed.data)
  res.status(201).json(account)
})

bankAccountsRouter.delete("/:id", async (req, res) => {
  const removed = await removeBankAccount(req.auth!.externalId, req.params.id)
  if (!removed) {
    return res.status(404).json({ error: "NOT_FOUND" })
  }
  res.status(204).send()
})
