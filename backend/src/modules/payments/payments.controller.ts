import { Router } from "express"
import { requireAuth } from "../auth/auth.middleware"
import { logger } from "../../lib/logger"
import { createDepositOrderSchema } from "./payments.validators"
import { createDepositOrder } from "./payments.service"

/** Player-facing — mounted after express.json()/apiLimiter alongside the rest of the authenticated API. */
export const paymentsRouter = Router()
paymentsRouter.use(requireAuth)

paymentsRouter.post("/deposit", async (req, res) => {
  const parsed = createDepositOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const order = await createDepositOrder(req.auth!.externalId, parsed.data.amount)
    res.status(201).json(order)
  } catch (err) {
    logger.error({ err }, "Failed to create deposit order")
    res.status(502).json({ error: "GATEWAY_ERROR", message: "Unable to start deposit right now — please try again shortly." })
  }
})
