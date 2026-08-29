import { z } from "zod"

export const createDepositOrderSchema = z.object({
  amount: z.number().min(100, "Minimum deposit amount is ₹100"),
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

/** Shape of Cashfree's webhook body — signature is checked separately (raw body), this only validates structure. */
export const cashfreeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    order: z.object({ order_id: z.string().min(1) }),
    payment: z.object({ payment_amount: z.number() }),
  }),
})
