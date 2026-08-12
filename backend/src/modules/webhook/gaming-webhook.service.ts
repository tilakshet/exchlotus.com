import { prisma } from "../../lib/prisma"
import { GamingApiError } from "../../lib/api-error"
import { applyLedgerEntry, getWalletBalance } from "../wallet/wallet.service"
import type { GamingWebhookRequest } from "./gaming-webhook.validators"

export async function handleGamingWebhook(request: GamingWebhookRequest): Promise<unknown> {
  switch (request.method) {
    case "account_details": {
      const player = await prisma.player.findUnique({ where: { externalId: request.user_id } })
      if (!player) {
        throw new GamingApiError("INVALID_USER", `No player found for user_id ${request.user_id}`)
      }
      // Response shape (email, name_jogador, date) matches the spec's own
      // example verbatim, including the untranslated field name.
      return {
        email: player.email,
        name_jogador: player.username,
        date: player.createdAt.toISOString(),
      }
    }

    case "user_balance": {
      const balance = await getWalletBalance(request.user_id)
      // Spec's example uses `status: 1` here, not `status: true` like every
      // other method — kept exactly as documented rather than normalized.
      return { status: 1, balance }
    }

    case "transaction_bet": {
      if (request.bet <= 0) {
        throw new GamingApiError("NO_AMOUNT", "bet must be a positive amount")
      }
      const result = await applyLedgerEntry({
        playerExternalId: request.user_id,
        type: "BET",
        transactionId: request.transaction_id,
        roundId: request.round_id,
        gameId: request.game,
        sessionId: request.session_id,
        amount: -Math.abs(request.bet),
      })
      return { status: true, balance: result.balance }
    }

    case "transaction_win": {
      if (request.win <= 0) {
        throw new GamingApiError("NO_AMOUNT", "win must be a positive amount")
      }
      const result = await applyLedgerEntry({
        playerExternalId: request.user_id,
        type: "WIN",
        transactionId: request.transaction_id,
        roundId: request.round_id,
        gameId: request.game,
        sessionId: request.session_id,
        amount: Math.abs(request.win),
      })
      return { status: true, balance: result.balance }
    }

    case "refund": {
      // Spec §5.5 says refund can reverse either a bet (credit back a debit)
      // or an invalid win payout (debit back a credit), but the payload has
      // no field indicating which — and the only worked example (§5.5) is a
      // credit. Implemented as always-credit to match that example; if
      // refund-of-a-win ever needs to be a debit, this needs a
      // disambiguating field from the provider (see README "Open questions").
      if (request.amount <= 0) {
        throw new GamingApiError("NO_AMOUNT", "amount must be a positive amount")
      }
      const result = await applyLedgerEntry({
        playerExternalId: request.user_id,
        type: "REFUND",
        transactionId: request.transaction_id,
        roundId: request.round_id,
        gameId: request.game,
        sessionId: request.session_id,
        amount: Math.abs(request.amount),
      })
      return { status: true, balance: result.balance }
    }
  }
}
