import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CreditCard, IndianRupee, Percent, QrCode, Ticket, Zap } from "lucide-react"
import { useCreateDepositOrder } from "@/hooks/useWallet"
import { ApiError, friendlyErrorMessage } from "@/api/api-error"
import { ComingSoon } from "@/features/account/ComingSoon"
import { StepHeading } from "@/features/account/StepHeading"
import { formatInr } from "@/lib/utils"

interface DepositSearch {
  status?: "pending"
}

export const Route = createFileRoute("/dashboard/account/deposit")({
  validateSearch: (search: Record<string, unknown>): DepositSearch => (search.status === "pending" ? { status: "pending" } : {}),
  component: DepositPage,
})

const MIN_DEPOSIT = 500
const MAX_DEPOSIT = 100_000
const quickAmounts = [500, 1000, 2000, 5000, 10_000, 25_000]
const PROCESSING_FEE = 0

const depositSchema = z.object({
  amount: z.coerce
    .number()
    .min(MIN_DEPOSIT, `Minimum deposit is ${formatInr(MIN_DEPOSIT)}`)
    .max(MAX_DEPOSIT, `Maximum deposit is ${formatInr(MAX_DEPOSIT)}`),
})
type DepositInput = z.input<typeof depositSchema>
type DepositValues = z.output<typeof depositSchema>

function DepositPage() {
  const { status } = Route.useSearch()
  const deposit = useCreateDepositOrder()
  const [couponMessage, setCouponMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DepositInput, unknown, DepositValues>({ resolver: zodResolver(depositSchema), defaultValues: { amount: 500 as unknown as DepositInput["amount"] } })
  const amount = watch("amount")
  const numericAmount = Number(amount) || 0
  const totalPayable = numericAmount + PROCESSING_FEE

  async function onSubmit(values: DepositValues) {
    try {
      const order = await deposit.mutateAsync(values.amount)
      // The wallet only actually credits once the gateway's callback lands
      // (backend payments.service.ts) — this redirect just hands the player
      // off to pay, it isn't itself a success signal.
      window.location.href = order.paymentUrl
    } catch {
      // Surfaced via deposit.isError/deposit.error below.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {status === "pending" && (
        <div
          role="status"
          className="rounded-[var(--acc-radius-lg)] px-6 py-4 text-base font-medium"
          style={{ background: "var(--acc-accent-soft)", color: "var(--acc-text-primary)" }}
        >
          Payment received — your balance updates automatically as soon as it's confirmed, usually within a minute.
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <section className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6">
            <StepHeading step={1} title="Enter Deposit Amount" />
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute top-1/2 left-4 size-5.5 -translate-y-1/2 text-[color:var(--acc-text-secondary)]" aria-hidden="true" strokeWidth={2.2} />
              <input
                type="number"
                step="1"
                min={MIN_DEPOSIT}
                max={MAX_DEPOSIT}
                aria-label="Deposit amount"
                aria-invalid={!!errors.amount}
                className="w-full rounded-[var(--acc-radius-md)] border py-4 pr-4 pl-12 text-2xl font-semibold outline-none focus:border-[color:var(--acc-accent)]"
                style={{ background: "var(--acc-input-bg)", color: "var(--acc-input-fg)", borderColor: "var(--acc-input-border)" }}
                {...register("amount")}
              />
            </div>
            <p className="mt-2 text-sm text-[color:var(--acc-text-secondary)]">
              Min: {formatInr(MIN_DEPOSIT)} Max: {formatInr(MAX_DEPOSIT)}
            </p>
            {errors.amount && (
              <p role="alert" className="mt-1 text-sm" style={{ color: "var(--acc-danger)" }}>
                {errors.amount.message}
              </p>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              {quickAmounts.map((preset) => {
                const active = numericAmount === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setValue("amount", preset as unknown as DepositInput["amount"], { shouldValidate: true })}
                    aria-pressed={active}
                    className="rounded-[var(--acc-radius-md)] border px-2 py-3 text-base font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                    style={active ? { background: "var(--acc-accent)", borderColor: "var(--acc-accent)", color: "var(--acc-accent-fg)" } : { borderColor: "var(--acc-border)", color: "var(--acc-text-primary)" }}
                  >
                    {formatInr(preset)}
                  </button>
                )
              })}
            </div>

            <div className="mt-6">
              <h3 className="mb-2.5 text-lg font-semibold text-[color:var(--acc-text-primary)]">Bonus Coupon (Optional)</h3>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="WELCOME"
                  aria-label="Bonus coupon code"
                  className="flex-1 rounded-[var(--acc-radius-md)] border px-4 py-3 text-base font-semibold uppercase outline-none focus:border-[color:var(--acc-accent)]"
                  style={{ background: "var(--acc-input-bg)", color: "var(--acc-input-fg)", borderColor: "var(--acc-input-border)" }}
                />
                <button
                  type="button"
                  onClick={() => setCouponMessage("Coupons aren't available yet — this deposit will go through without a bonus.")}
                  className="rounded-[var(--acc-radius-md)] px-6 py-3 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                  style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
                >
                  Apply
                </button>
              </div>
              {couponMessage && (
                <div className="mt-2.5">
                  <ComingSoon message={couponMessage} />
                </div>
              )}
            </div>
          </section>

          {/* Payment Method (step 2) and the Payment Summary breakdown (step 3,
              below) are desktop-only — mobile goes straight from the amount
              (step 1) to the Deposit button, no intermediate steps to tap
              through. The button itself, and any error, still show on mobile. */}
          <section className="hidden rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6 lg:block">
            <StepHeading step={2} title="Payment Method" />
            <p className="flex items-start gap-2.5 text-base text-[color:var(--acc-text-secondary)]">
              <QrCode className="mt-0.5 size-5.5 shrink-0" style={{ color: "var(--acc-accent)" }} aria-hidden="true" strokeWidth={2.1} />
              You'll be redirected to a secure payment page to scan a QR code and complete payment. Your balance updates automatically once it's confirmed.
            </p>
          </section>
        </div>

        <section className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6">
          <div className="hidden lg:block">
            <StepHeading step={3} title="Payment Summary" />
            <div className="flex flex-col gap-3 text-base">
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--acc-text-secondary)]">Deposit Amount</span>
                <span className="font-semibold text-[color:var(--acc-text-primary)]">{formatInr(numericAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--acc-text-secondary)]">Processing Fee</span>
                <span className="font-semibold" style={{ color: "var(--acc-success-fg)" }}>
                  {PROCESSING_FEE === 0 ? "Free" : formatInr(PROCESSING_FEE)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-[color:var(--acc-border-soft)] pt-3">
                <span className="text-lg font-semibold text-[color:var(--acc-text-primary)]">Total Payable</span>
                <span className="text-2xl font-bold" style={{ color: "var(--acc-accent)" }}>
                  {formatInr(totalPayable)}
                </span>
              </div>
            </div>
          </div>

          {deposit.isError && (
            <p role="alert" className="mt-4 text-base" style={{ color: "var(--acc-danger)" }}>
              {friendlyErrorMessage(deposit.error instanceof ApiError ? deposit.error : deposit.error)}
            </p>
          )}

          <button
            type="submit"
            disabled={deposit.isPending}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-[var(--acc-radius-md)] text-lg font-bold outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-10"
            style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
          >
            <CreditCard className="size-5.5" aria-hidden="true" strokeWidth={2.2} />
            {deposit.isPending ? "Redirecting…" : "Proceed to Deposit"}
          </button>
        </section>
      </form>

      {/* Promotional — informational only, not tied to any bonus/reward backend yet. Desktop-only, keeps mobile focused on amount -> Deposit. */}
      <section className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
        <div className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-5 text-center">
          <p className="mb-1.5 text-base italic text-[color:var(--acc-text-secondary)]">Extra Bonus</p>
          <p className="flex items-center justify-center gap-2.5 text-xl font-bold italic text-[color:var(--acc-text-primary)]">
            <Percent className="size-6.5" style={{ color: "var(--acc-accent)" }} aria-hidden="true" strokeWidth={2.2} />
            1% Back via App
          </p>
        </div>
        <div className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-5 text-center">
          <p className="mb-1.5 text-base italic text-[color:var(--acc-text-secondary)]">Extra Bonus</p>
          <p className="flex items-center justify-center gap-2.5 text-xl font-bold italic text-[color:var(--acc-text-primary)]">
            <Zap className="size-6.5" style={{ color: "var(--acc-accent)" }} aria-hidden="true" strokeWidth={2.2} />
            500 FREE via App
          </p>
        </div>
        <div className="rounded-[var(--acc-radius-lg)] p-5 text-center sm:col-span-2" style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}>
          <p className="mb-1.5 text-base italic opacity-90">Extra Bonus</p>
          <p className="flex items-center justify-center gap-2.5 text-xl font-bold italic">
            <Ticket className="size-6.5" aria-hidden="true" strokeWidth={2.2} />
            WELCOME
          </p>
        </div>
      </section>
    </div>
  )
}
