import { z } from "zod"

export const createDepositOrderSchema = z.object({
  amount: z.number().positive(),
})

/** No signature field — see payments.service.ts for how that's mitigated. */
export const payinCallbackSchema = z.object({
  order_id: z.string().min(1),
  amount: z.union([z.string(), z.number()]),
  status: z.string(),
  utr: z.string().nullable().optional(),
})

export const payoutCallbackSchema = z.object({
  cus_trx_id: z.string().min(1),
  status: z.string(),
  utr: z.string().nullable().optional(),
})
