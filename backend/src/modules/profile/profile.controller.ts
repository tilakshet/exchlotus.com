import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma"
import { requireAuth } from "../auth/auth.middleware"

export const profileRouter = Router()
profileRouter.use(requireAuth)

function serializePlayer(player: {
  username: string
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  dateOfBirth: Date | null
  currency: string
  createdAt: Date
}) {
  return {
    username: player.username,
    email: player.email,
    phone: player.phone,
    firstName: player.firstName,
    lastName: player.lastName,
    dateOfBirth: player.dateOfBirth ? player.dateOfBirth.toISOString().slice(0, 10) : null,
    currency: player.currency,
    memberSince: player.createdAt.toISOString(),
  }
}

profileRouter.get("/", async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.auth!.sub } })
  if (!player) {
    return res.status(404).json({ error: "NOT_FOUND" })
  }
  res.json(serializePlayer(player))
})

// Email/phone are deliberately excluded — they're identity fields tied to
// login (unique, used for OTP/password auth), not profile display fields.
const updateProfileSchema = z.object({
  username: z.string().min(2).max(40).optional(),
  firstName: z.string().max(60).nullable().optional(),
  lastName: z.string().max(60).nullable().optional(),
  dateOfBirth: z.string().date().nullable().optional(),
})

profileRouter.patch("/", async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }

  const { dateOfBirth, ...rest } = parsed.data
  const player = await prisma.player.update({
    where: { id: req.auth!.sub },
    data: {
      ...rest,
      ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}),
    },
  })
  res.json(serializePlayer(player))
})
