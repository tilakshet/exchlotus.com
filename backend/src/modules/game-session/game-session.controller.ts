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
  // The provider's launch spec requires lang — defaults to "en" since the
  // frontend has always sent it anyway, but isn't hard-required here in
  // case an older client build doesn't.
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
      lang: parsed.data.lang ?? "en",
      mode: parsed.data.mode,
      user_id: req.auth!.externalId,
      user_name: req.auth!.username,
    })

    // Fail CLOSED, not open: a real-money request must come back with an
    // explicit "real" session. `session` is optional in the response type,
    // so a provider that silently serves a fun/demo session while simply
    // omitting `session` from the response must not slip through as
    // success just because it didn't actively echo a mismatched mode.
    const returnedMode = launch.session?.mode
    if (parsed.data.mode === "real" && returnedMode !== "real") {
      logger.error(
        { gameId: parsed.data.gameId, requestedMode: parsed.data.mode, returnedMode },
        "Gaming provider did not confirm a real-money session for a real-money request"
      )
      return res.status(502).json({
        error: "GAME_UNAVAILABLE",
        message: "This game is temporarily unavailable. Please try another game or try again shortly.",
      })
    }

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
