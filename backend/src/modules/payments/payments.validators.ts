import { z } from "zod"

// Must match the active PayIn gateway's own floor (Oro/housholdbajar
// rejects anything under ₹300 — confirmed against their live API), not an
// arbitrary UX choice — see the frontend's matching MIN_DEPOSIT.
export const createDepositOrderSchema = z.object({
  amount: z.number().min(300, "Minimum deposit amount is ₹300"),
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
