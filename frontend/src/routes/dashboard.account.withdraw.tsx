import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, CreditCard, IndianRupee, Landmark, Plus, Trash2, Wallet as WalletIcon } from "lucide-react"
import { useWallet, useWithdraw } from "@/hooks/useWallet"
import { useBankAccounts } from "@/hooks/useBankAccounts"
import { ApiError, friendlyErrorMessage } from "@/api/api-error"
import { ComingSoon } from "@/features/account/ComingSoon"
import { StepHeading } from "@/features/account/StepHeading"
import { formatInr } from "@/lib/utils"

export const Route = createFileRoute("/dashboard/account/withdraw")({
  component: WithdrawPage,
})

const MIN_WITHDRAW = 1000
const MAX_WITHDRAW = 1_000_000
const WITHDRAWAL_CHARGE = 0

const faqs = [
  { q: "How long do withdrawals take?", a: "Withdrawals here are processed instantly against your account balance — there's no manual review queue in this build." },
  { q: "Is there a withdrawal fee?", a: "No fees are applied to withdrawals." },
  { q: "Why do I need a payout method?", a: "Saved bank accounts are stored on this device for reference — there's no bank verification or payout gateway in this build, so withdrawals still credit your in-app balance directly rather than transferring to the account." },
]

function maskAccountNumber(accountNumber: string) {
  return `•••• ${accountNumber.slice(-4)}`
}

function WithdrawPage() {
  const { data: wallet } = useWallet()
  const withdraw = useWithdraw()
  const { accounts, removeAccount } = useBankAccounts()
  const [payoutNote, setPayoutNote] = useState<string | null>(null)
  const [successBalance, setSuccessBalance] = useState<number | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const availableBalance = wallet?.balance ?? 0

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedAccountId(null)
      return
    }
    if (!selectedAccountId || !accounts.some((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  const withdrawSchema = z.object({
    amount: z.coerce
      .number()
      .min(MIN_WITHDRAW, `Minimum withdrawal is ${formatInr(MIN_WITHDRAW)}`)
      .max(MAX_WITHDRAW, `Maximum withdrawal is ${formatInr(MAX_WITHDRAW)}`)
      .refine((value) => value <= availableBalance, {
        message: `Amount exceeds your available balance of ${formatInr(availableBalance)}`,
      }),
  })
  type WithdrawInput = z.input<typeof withdrawSchema>
  type WithdrawValues = z.output<typeof withdrawSchema>

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WithdrawInput, unknown, WithdrawValues>({ resolver: zodResolver(withdrawSchema) })
  const amount = watch("amount")
  const numericAmount = Number(amount) || 0
  const netAmount = Math.max(0, numericAmount - WITHDRAWAL_CHARGE)

  async function onSubmit(values: WithdrawValues) {
    setSuccessBalance(null)
    try {
      const result = await withdraw.mutateAsync(values.amount)
      setSuccessBalance(result.balance)
    } catch {
      // Surfaced via withdraw.isError/withdraw.error below.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex items-center justify-between rounded-[var(--acc-radius-lg)] px-7 py-6"
        style={{ background: "var(--acc-success-bg)", color: "var(--acc-success-fg)" }}
      >
        <span className="flex items-center gap-3 text-lg font-medium">
          <WalletIcon className="size-7.5" aria-hidden="true" strokeWidth={2.1} />
          Withdrawable Balance
        </span>
        <span className="text-[28px] font-bold">{formatInr(availableBalance)}</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <section className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6">
            <StepHeading step={1} title="Enter Withdrawal Amount" />
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute top-1/2 left-4 size-5.5 -translate-y-1/2 text-[color:var(--acc-text-secondary)]" aria-hidden="true" strokeWidth={2.2} />
              <input
                type="number"
                step="1"
                min={MIN_WITHDRAW}
                max={MAX_WITHDRAW}
                placeholder="Enter Amount"
                aria-label="Withdrawal amount"
                aria-invalid={!!errors.amount}
                className="w-full rounded-[var(--acc-radius-md)] border py-4 pr-4 pl-12 text-2xl font-semibold outline-none focus:border-[color:var(--acc-accent)]"
                style={{ background: "var(--acc-input-bg)", color: "var(--acc-input-fg)", borderColor: "var(--acc-input-border)" }}
                {...register("amount")}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-[color:var(--acc-text-secondary)]">
              <span>
                Min: {formatInr(MIN_WITHDRAW)} Max: {formatInr(MAX_WITHDRAW)}
              </span>
              <span>Withdrawals are processed instantly</span>
            </div>
            {errors.amount && (
              <p role="alert" className="mt-1 text-sm" style={{ color: "var(--acc-danger)" }}>
                {errors.amount.message}
              </p>
            )}

            <h3 className="mt-6 mb-2.5 text-lg font-semibold text-[color:var(--acc-text-primary)]">Select your Bank Account</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {accounts.map((account) => {
                const active = account.id === selectedAccountId
                return (
                  <div
                    key={account.id}
                    role="radio"
                    aria-checked={active}
                    tabIndex={0}
                    onClick={() => setSelectedAccountId(account.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedAccountId(account.id)}
                    className="relative flex cursor-pointer items-start gap-3 rounded-[var(--acc-radius-md)] border-2 p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                    style={{ borderColor: active ? "var(--acc-accent)" : "var(--acc-border)", background: active ? "var(--acc-accent-soft)" : "transparent" }}
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--acc-accent-soft)" }}>
                      <Landmark className="size-5.5" style={{ color: "var(--acc-accent)" }} aria-hidden="true" strokeWidth={2.1} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[color:var(--acc-text-primary)]">{account.bankName}</p>
                      <p className="truncate text-sm text-[color:var(--acc-text-secondary)]">{account.accountHolderName}</p>
                      <p className="mt-0.5 font-mono text-sm text-[color:var(--acc-text-secondary)]">{maskAccountNumber(account.accountNumber)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${account.bankName} account`}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeAccount(account.id)
                      }}
                      className="rounded-full p-1.5 outline-none transition-colors hover:bg-[color:var(--acc-danger-bg)] focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                      style={{ color: "var(--acc-text-secondary)" }}
                    >
                      <Trash2 className="size-4.5" aria-hidden="true" />
                    </button>
                  </div>
                )
              })}

              <Link
                to="/dashboard/account/add-bank"
                className="flex flex-col items-center justify-center gap-2 rounded-[var(--acc-radius-md)] border px-4 py-7 text-base font-medium outline-none transition-colors hover:bg-[color:var(--acc-bg)] focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                style={{ borderColor: "var(--acc-border)", color: "var(--acc-text-primary)" }}
              >
                <span className="flex size-12 items-center justify-center rounded-full" style={{ background: "var(--acc-accent-soft)" }}>
                  <Plus className="size-6.5" style={{ color: "var(--acc-accent)" }} aria-hidden="true" strokeWidth={2.2} />
                </span>
                {accounts.length === 0 ? "Add Bank Account" : "Add Another Bank"}
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setPayoutNote("Saved crypto wallets aren't available yet — withdrawals credit your in-app balance directly.")}
              className="mt-3 flex items-center gap-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
              style={{ color: "var(--acc-text-secondary)" }}
            >
              <Plus className="size-4.5" aria-hidden="true" />
              Add Crypto Wallet instead
            </button>
            {payoutNote && (
              <div className="mt-3">
                <ComingSoon message={payoutNote} />
              </div>
            )}
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6">
              <StepHeading step={2} title="Withdrawal Summary" />
              <div className="flex flex-col gap-3 text-base">
                <div className="flex items-center justify-between">
                  <span className="text-[color:var(--acc-text-secondary)]">Withdrawal Amount</span>
                  <span className="font-semibold text-[color:var(--acc-text-primary)]">{formatInr(numericAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[color:var(--acc-text-secondary)]">Charges</span>
                  <span className="font-semibold" style={{ color: "var(--acc-success-fg)" }}>
                    {WITHDRAWAL_CHARGE === 0 ? "Free" : formatInr(WITHDRAWAL_CHARGE)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-[color:var(--acc-border-soft)] pt-3">
                  <span className="text-lg font-semibold text-[color:var(--acc-text-primary)]">Net Amount</span>
                  <span className="text-2xl font-bold" style={{ color: "var(--acc-accent)" }}>
                    {formatInr(netAmount)}
                  </span>
                </div>
                <p className="text-sm text-[color:var(--acc-text-secondary)]">Processed instantly to your account balance.</p>
              </div>

              {withdraw.isError && (
                <p role="alert" className="mt-4 text-base" style={{ color: "var(--acc-danger)" }}>
                  {friendlyErrorMessage(withdraw.error instanceof ApiError ? withdraw.error : withdraw.error)}
                </p>
              )}
              {successBalance !== null && (
                <p role="status" className="mt-4 flex items-center gap-2 text-base font-medium" style={{ color: "var(--acc-success-fg)" }}>
                  <CheckCircle2 className="size-5.5" aria-hidden="true" />
                  Withdrawal successful — new balance {formatInr(successBalance)}
                </p>
              )}

              <button
                type="submit"
                disabled={withdraw.isPending}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-[var(--acc-radius-md)] text-lg font-bold outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
              >
                <CreditCard className="size-5.5" aria-hidden="true" strokeWidth={2.2} />
                {withdraw.isPending ? "Processing…" : "Withdraw Now"}
              </button>
            </div>
          </section>
        </div>
      </form>

      <section>
        <h3 className="mb-4 text-center text-xl font-bold" style={{ color: "var(--acc-accent)" }}>
          Frequently Asked Questions
        </h3>
        <div className="flex flex-col gap-3">
          {faqs.map(({ q, a }) => (
            <details key={q} className="rounded-[var(--acc-radius-md)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-4">
              <summary className="flex cursor-pointer items-center gap-2.5 text-base font-semibold text-[color:var(--acc-text-primary)]">
                {q === faqs[0].q ? <WalletIcon className="size-5.5 shrink-0" aria-hidden="true" /> : <CreditCard className="size-5.5 shrink-0" aria-hidden="true" />}
                {q}
              </summary>
              <p className="mt-2.5 text-base text-[color:var(--acc-text-secondary)]">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
