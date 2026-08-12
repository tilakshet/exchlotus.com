import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { useDeposit, useWithdraw } from "@/hooks/useWallet"
import { ApiError, friendlyErrorMessage } from "@/api/api-error"

const amountSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than 0"),
})
type AmountInput = z.input<typeof amountSchema>
type AmountValues = z.output<typeof amountSchema>

/**
 * Deposit/withdraw are instant, unconditional balance adjustments today —
 * there's no payment gateway behind this yet (see backend README). The UI
 * doesn't pretend otherwise: no card/UPI fields, just an amount, because
 * that's genuinely all the backend can act on right now.
 */
export function DepositWithdrawForm() {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit")
  const deposit = useDeposit()
  const withdraw = useWithdraw()
  const mutation = mode === "deposit" ? deposit : withdraw

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AmountInput, unknown, AmountValues>({ resolver: zodResolver(amountSchema) })

  async function onSubmit(values: AmountValues) {
    try {
      await mutation.mutateAsync(values.amount)
      reset()
    } catch {
      // Surfaced via mutation.isError/mutation.error below — nothing further
      // to do here, just don't let it become an unhandled rejection.
    }
  }

  return (
    <div className="rounded-[var(--sb-radius-md)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-bg)] p-4">
      <div className="mb-3 inline-flex rounded-[var(--sb-radius-sm)] border border-[color:var(--sb-border)] p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("deposit")}
          aria-pressed={mode === "deposit"}
          className={`flex items-center gap-1.5 rounded-[var(--sb-radius-sm)] px-3 py-1.5 font-medium transition-colors ${
            mode === "deposit" ? "bg-[color:var(--sb-content-alt)] text-[color:var(--sb-text-primary)]" : "text-[color:var(--sb-text-secondary)]"
          }`}
        >
          <ArrowDownToLine className="size-6" aria-hidden="true" />
          Deposit
        </button>
        <button
          type="button"
          onClick={() => setMode("withdraw")}
          aria-pressed={mode === "withdraw"}
          className={`flex items-center gap-1.5 rounded-[var(--sb-radius-sm)] px-3 py-1.5 font-medium transition-colors ${
            mode === "withdraw" ? "bg-[color:var(--sb-content-alt)] text-[color:var(--sb-text-primary)]" : "text-[color:var(--sb-text-secondary)]"
          }`}
        >
          <ArrowUpFromLine className="size-6" aria-hidden="true" />
          Withdraw
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-2" noValidate>
        <div className="flex-1">
          <label htmlFor="amount" className="sr-only">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            aria-invalid={!!errors.amount}
            className="w-full rounded-[var(--sb-radius-sm)] border border-[color:var(--sb-border)] px-3 py-2 text-sm text-[color:var(--sb-text-primary)] outline-none focus:border-[color:var(--sb-accent-gold)]"
            {...register("amount")}
          />
          {errors.amount && (
            <p role="alert" className="mt-1 text-xs text-red-400">
              {errors.amount.message}
            </p>
          )}
          {mutation.isError && (
            <p role="alert" className="mt-1 text-xs text-red-400">
              {friendlyErrorMessage(mutation.error instanceof ApiError ? mutation.error : mutation.error)}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-[var(--sb-radius-sm)] px-4 py-2 text-sm font-semibold text-[color:var(--sb-accent-gold-fg)] outline-none transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--sb-accent-gold)" }}
        >
          {mutation.isPending ? "Processing…" : mode === "deposit" ? "Deposit" : "Withdraw"}
        </button>
      </form>
    </div>
  )
}
