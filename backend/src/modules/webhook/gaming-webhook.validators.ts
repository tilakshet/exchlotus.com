import { z } from "zod"

const base = {
  user_id: z.string().min(1),
}

export const accountDetailsSchema = z.object({
  method: z.literal("account_details"),
  ...base,
})

export const userBalanceSchema = z.object({
  method: z.literal("user_balance"),
  ...base,
})

export const transactionBetSchema = z.object({
  method: z.literal("transaction_bet"),
  ...base,
  transaction_id: z.string().min(1),
  session_id: z.string().min(1),
  round_id: z.string().min(1),
  game: z.string().min(1),
  bet: z.number(),
})

export const transactionWinSchema = z.object({
  method: z.literal("transaction_win"),
  ...base,
  transaction_id: z.string().min(1),
  session_id: z.string().min(1),
  round_id: z.string().min(1),
  game: z.string().min(1),
  bet: z.number(),
  win: z.number(),
})

export const refundSchema = z.object({
  method: z.literal("refund"),
  ...base,
  transaction_id: z.string().min(1),
  session_id: z.string().min(1),
  round_id: z.string().min(1),
  game: z.string().min(1),
  amount: z.number(),
})

export const gamingWebhookRequestSchema = z.discriminatedUnion("method", [
  accountDetailsSchema,
  userBalanceSchema,
  transactionBetSchema,
  transactionWinSchema,
  refundSchema,
])

export type GamingWebhookRequest = z.infer<typeof gamingWebhookRequestSchema>
