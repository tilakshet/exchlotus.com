import { z } from "zod"

// Must stay in sync with the frontend's MIN_DEPOSIT.
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

/**
 * Shape of HousholdBajar's PayIn callback body — signature is checked
 * separately (raw body), this only validates structure. `amount` is coerced
 * (not the string|number union payinCallbackSchema uses above) so a
 * malformed value like "abc" is rejected here with a clean 400, rather than
 * passing validation and only failing later as an unhandled Prisma.Decimal
 * error deep inside handlePayinCallback.
 */
export const housholdbajarCallbackSchema = z.object({
  order_id: z.string().min(1),
  payment_status: z.string(),
  amount: z.coerce.number().finite(),
  trx_id: z.string().optional(),
  utr: z.string().nullable().optional(),
  cashfree_order_id: z.string().optional(),
  cf_payment_id: z.string().optional(),
  timestamp: z.string().optional(),
})
