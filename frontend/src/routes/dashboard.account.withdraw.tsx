import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Clock, CreditCard, IndianRupee, Landmark, Plus, ShieldAlert, Trash2, Wallet as WalletIcon } from "lucide-react"
import { useWallet, useWithdraw } from "@/hooks/useWallet"
import { useBankAccounts } from "@/hooks/useBankAccounts"
import { useProfile } from "@/hooks/useProfile"
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
  { q: "How long do withdrawals take?", a: "Your request goes to review first — once approved, payout to your bank account is usually quick, but can take longer depending on your bank." },
  { q: "Is there a withdrawal fee?", a: "No fees are applied to withdrawals." },
  { q: "Why do I need a payout method?", a: "Your bank account details are where an approved withdrawal actually gets paid out to." },
]

function maskAccountNumber(accountNumber: string) {
  return `•••• ${accountNumber.slice(-4)}`
}

function WithdrawPage() {
  const { data: wallet } = useWallet()
  const { data: profile } = useProfile()
  const withdraw = useWithdraw()
  const { accounts, removeAccount } = useBankAccounts()
  const [payoutNote, setPayoutNote] = useState<string | null>(null)
  const [requestedAmount, setRequestedAmount] = useState<number | null>(null)
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
    if (!selectedAccountId) return
    setRequestedAmount(null)
    try {
      await withdraw.mutateAsync({ amount: values.amount, bankAccountId: selectedAccountId })
      setRequestedAmount(values.amount)
    } catch {
      // Surfaced via withdraw.isError/withdraw.error below.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-center justify-between rounded-[var(--acc-radius-lg)] px-5 py-4"
        style={{ background: "var(--acc-success-bg)", color: "var(--acc-success-fg)" }}
      >
        <span className="flex items-center gap-2.5 text-base font-medium">
          <WalletIcon className="size-6" aria-hidden="true" strokeWidth={2.1} />
          Withdrawable Balance
        </span>
        <span className="text-xl font-bold">{formatInr(availableBalance)}</span>
      </div>

      {profile && profile.kycStatus !== "APPROVED" ? (
        <div
          className="flex flex-col items-start gap-2.5 rounded-[var(--acc-radius-lg)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={profile.kycStatus === "PENDING" ? { background: "var(--acc-pending-bg)", color: "var(--acc-pending-fg)" } : { background: "var(--acc-danger-bg)", color: "var(--acc-danger)" }}
        >
          <span className="flex items-center gap-2.5 text-base font-medium">
            {profile.kycStatus === "PENDING" ? (
              <Clock className="size-6 shrink-0" aria-hidden="true" strokeWidth={2.1} />
            ) : (
              <ShieldAlert className="size-6 shrink-0" aria-hidden="true" strokeWidth={2.1} />
            )}
            {profile.kycStatus === "PENDING"
              ? "Your KYC verification is under review — withdrawals unlock once it's approved."
              : "Complete KYC verification before you can withdraw."}
          </span>
          {profile.kycStatus !== "PENDING" && (
            <Link
              to="/dashboard/account/kyc"
              className="flex h-10 shrink-0 items-center rounded-[var(--acc-radius-md)] px-5 text-sm font-bold whitespace-nowrap outline-none transition-opacity hover:opacity-90"
              style={{ background: "var(--acc-danger)", color: "white" }}
            >
              Verify Now
            </Link>
          )}
        </div>
      ) : (
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <section className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-4">
            <StepHeading step={1} title="Enter Withdrawal Amount" />
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-[color:var(--acc-text-secondary)]" aria-hidden="true" strokeWidth={2.2} />
              <input
                type="number"
                step="1"
                min={MIN_WITHDRAW}
                max={MAX_WITHDRAW}
                placeholder="Enter Amount"
                aria-label="Withdrawal amount"
                aria-invalid={!!errors.amount}
                className="w-full rounded-[var(--acc-radius-md)] border py-2.5 pr-4 pl-10 text-lg font-semibold outline-none focus:border-[color:var(--acc-accent)]"
                style={{ background: "var(--acc-input-bg)", color: "var(--acc-input-fg)", borderColor: "var(--acc-input-border)" }}
                {...register("amount")}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[color:var(--acc-text-secondary)]">
              <span>
                Min: {formatInr(MIN_WITHDRAW)} Max: {formatInr(MAX_WITHDRAW)}
              </span>
              <span>Withdrawals are reviewed before payout</span>
            </div>
            {errors.amount && (
              <p role="alert" className="mt-1 text-sm" style={{ color: "var(--acc-danger)" }}>
                {errors.amount.message}
              </p>
            )}

            <h3 className="mt-4 mb-2 text-sm font-semibold text-[color:var(--acc-text-primary)]">Select your Bank Account</h3>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                    className="relative flex cursor-pointer items-start gap-2.5 rounded-[var(--acc-radius-md)] border-2 p-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                    style={{ borderColor: active ? "var(--acc-accent)" : "var(--acc-border)", background: active ? "var(--acc-accent-soft)" : "transparent" }}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--acc-accent-soft)" }}>
                      <Landmark className="size-4.5" style={{ color: "var(--acc-accent)" }} aria-hidden="true" strokeWidth={2.1} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[color:var(--acc-text-primary)]">{account.bankName}</p>
                      <p className="truncate text-xs text-[color:var(--acc-text-secondary)]">{account.accountHolderName}</p>
                      <p className="mt-0.5 font-mono text-xs text-[color:var(--acc-text-secondary)]">{maskAccountNumber(account.accountNumber)}</p>
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
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                )
              })}

              <Link
                to="/dashboard/account/add-bank"
                className="flex flex-col items-center justify-center gap-1.5 rounded-[var(--acc-radius-md)] border px-4 py-5 text-sm font-medium outline-none transition-colors hover:bg-[color:var(--acc-bg)] focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                style={{ borderColor: "var(--acc-border)", color: "var(--acc-text-primary)" }}
              >
                <span className="flex size-10 items-center justify-center rounded-full" style={{ background: "var(--acc-accent-soft)" }}>
                  <Plus className="size-5.5" style={{ color: "var(--acc-accent)" }} aria-hidden="true" strokeWidth={2.2} />
                </span>
                {accounts.length === 0 ? "Add Bank Account" : "Add Another Bank"}
              </Link>
            </div>

            {/* Non-functional stub (crypto payout doesn't exist) — desktop-only so mobile isn't cluttered with a dead end. */}
            <div className="hidden lg:block">
              <button
                type="button"
                onClick={() => setPayoutNote("Crypto payouts aren't available yet — bank transfer is the only payout method right now.")}
                className="mt-2.5 flex items-center gap-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                style={{ color: "var(--acc-text-secondary)" }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add Crypto Wallet instead
              </button>
              {payoutNote && (
                <div className="mt-2.5">
                  <ComingSoon message={payoutNote} />
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-4">
              {/* Summary breakdown is desktop-only — mobile goes straight from the amount/bank-account step to the Request Withdrawal button below. */}
              <div className="hidden lg:block">
                <StepHeading step={2} title="Withdrawal Summary" />
                <div className="flex flex-col gap-2 text-sm">
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
                  <div className="mt-1 flex items-center justify-between border-t border-[color:var(--acc-border-soft)] pt-2">
                    <span className="text-sm font-semibold text-[color:var(--acc-text-primary)]">Net Amount</span>
                    <span className="text-lg font-bold" style={{ color: "var(--acc-accent)" }}>
                      {formatInr(netAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-[color:var(--acc-text-secondary)]">Reviewed before payout to your selected bank account.</p>
                </div>
              </div>

              {withdraw.isError && (
                <p role="alert" className="mt-3 text-sm" style={{ color: "var(--acc-danger)" }}>
                  {friendlyErrorMessage(withdraw.error instanceof ApiError ? withdraw.error : withdraw.error)}
                </p>
              )}
              {!withdraw.isError && !selectedAccountId && (
                <p role="alert" className="mt-3 text-sm" style={{ color: "var(--acc-danger)" }}>
                  Add a bank account below before requesting a withdrawal.
                </p>
              )}
              {requestedAmount !== null && (
                <p role="status" className="mt-3 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--acc-success-fg)" }}>
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                  Withdrawal requested — {formatInr(requestedAmount)} is reserved and pending review.
                </p>
              )}

              <button
                type="submit"
                disabled={withdraw.isPending || !selectedAccountId}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--acc-radius-md)] text-base font-bold outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
              >
                <CreditCard className="size-5" aria-hidden="true" strokeWidth={2.2} />
                {withdraw.isPending ? "Requesting…" : "Request Withdrawal"}
              </button>
            </div>
          </section>
        </div>
      </form>
      )}

      <section className="hidden lg:block">
        <h3 className="mb-3 text-center text-lg font-bold" style={{ color: "var(--acc-accent)" }}>
          Frequently Asked Questions
        </h3>
        <div className="flex flex-col gap-2.5">
          {faqs.map(({ q, a }) => (
            <details key={q} className="rounded-[var(--acc-radius-md)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-3.5">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[color:var(--acc-text-primary)]">
                {q === faqs[0].q ? <WalletIcon className="size-5 shrink-0" aria-hidden="true" /> : <CreditCard className="size-5 shrink-0" aria-hidden="true" />}
                {q}
              </summary>
              <p className="mt-2 text-sm text-[color:var(--acc-text-secondary)]">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
