import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../auth/auth.middleware"
import { logger } from "../../lib/logger"
import { gamingProviderClient } from "../provider-integration/gaming-provider/gaming-provider.client"

export const gameSessionRouter = Router()
gameSessionRouter.use(requireAuth)

const launchRequestSchema = z.object({
  gameId: z.string().min(1),
  currency: z.string().length(3),
  // Accepted for backward compatibility with the frontend's existing
  // request shape, but not forwarded — the v2 launch endpoint's inferred
  // input shape (gameId, playerId, currency, mode) has no language field,
  // unlike the original spec's game_launch. See gaming-provider.types.ts.
  lang: z.string().min(2).optional(),
  mode: z.enum(["real", "fun"]),
})

// playerId comes from the verified access token, never the request body —
// a caller can no longer request a launch URL for an arbitrary user just
// by naming one in the payload.
gameSessionRouter.post("/launch", async (req, res) => {
  const parsed = launchRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_REQUEST", issues: parsed.error.issues })
  }

  try {
    const launch = await gamingProviderClient.launchSession({
      game_id: parsed.data.gameId,
      currency: parsed.data.currency,
      mode: parsed.data.mode,
      user_id: req.auth!.externalId,
    })
    res.json({ launchUrl: launch.game_url })
  } catch (err) {
    // The provider itself rejecting a launch (bad session config on their
    // end, our webhook URL not yet reachable from their side, etc.) is a
    // distinct, expected-to-happen failure mode — not an "our server
    // crashed" 500. Surfacing it as its own code lets the frontend show
    // "try another game" instead of a generic error, and keeps the full
    // provider error body in the log (not the response) for debugging.
    logger.error({ err, gameId: parsed.data.gameId, mode: parsed.data.mode }, "Game launch rejected by provider")
    res.status(502).json({
      error: "GAME_UNAVAILABLE",
      message: "This game is temporarily unavailable. Please try another game or try again shortly.",
    })
  }
})
