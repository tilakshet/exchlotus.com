import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CreditCard, IndianRupee, QrCode } from "lucide-react"
import { load as loadCashfree } from "@cashfreepayments/cashfree-js"
import { useCreateDepositOrder } from "@/hooks/useWallet"
import { ApiError, friendlyErrorMessage } from "@/api/api-error"
import { ComingSoon } from "@/features/account/ComingSoon"
import { StepHeading } from "@/features/account/StepHeading"
import { UpiPaymentPanel } from "@/features/account/UpiPaymentPanel"
import { formatInr } from "@/lib/utils"

/**
 * The PayIn gateway's `paymentUrl` is documented as a hosted checkout page
 * (payment-gateway.interface.ts), but in practice it can come back as a
 * bare `upi://` app-intent link instead — a real browser navigation target
 * for the former, nothing at all for the latter (no page behind it, so
 * `window.location.href` to it silently does nothing on desktop and is
 * unreliable on mobile). Only redirect for an actual web URL; anything else
 * falls back to UpiPaymentPanel's QR code.
 */
function isWebPaymentUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://")
}

interface DepositSearch {
  status?: "pending"
}

export const Route = createFileRoute("/dashboard/account/deposit")({
  validateSearch: (search: Record<string, unknown>): DepositSearch => (search.status === "pending" ? { status: "pending" } : {}),
  component: DepositPage,
})

const MIN_DEPOSIT = 100
const MAX_DEPOSIT = 100_000
const quickAmounts = [100, 200, 300, 400, 500]
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
  const [upiOrder, setUpiOrder] = useState<{ paymentUrl: string; amount: number } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DepositInput, unknown, DepositValues>({ resolver: zodResolver(depositSchema), defaultValues: { amount: 100 as unknown as DepositInput["amount"] } })
  const amount = watch("amount")
  const numericAmount = Number(amount) || 0
  const totalPayable = numericAmount + PROCESSING_FEE

  async function onSubmit(values: DepositValues) {
    try {
      const order = await deposit.mutateAsync(values.amount)
      // The wallet only actually credits once the gateway's callback lands
      // (backend payments.service.ts) — this redirect (or the QR panel
      // below) just hands the player off to pay, neither is itself a
      // success signal.
      if (order.paymentSessionId) {
        // Cashfree: no ready-made paymentUrl (its server-to-server Order Pay
        // API needs separate account approval — see cashfree-gateway.client.ts)
        // — its own checkout SDK reaches the identical hosted page without it.
        const cashfree = await loadCashfree({ mode: order.cashfreeMode ?? "sandbox" })
        await cashfree.checkout({ paymentSessionId: order.paymentSessionId, redirectTarget: "_self" })
      } else if (order.paymentUrl && isWebPaymentUrl(order.paymentUrl)) {
        window.location.href = order.paymentUrl
      } else if (order.paymentUrl) {
        setUpiOrder({ paymentUrl: order.paymentUrl, amount: values.amount })
      }
    } catch {
      // Surfaced via deposit.isError/deposit.error below.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {status === "pending" && (
        <div
          role="status"
          className="rounded-[var(--acc-radius-lg)] px-4 py-3 text-sm font-medium"
          style={{ background: "var(--acc-accent-soft)", color: "var(--acc-text-primary)" }}
        >
          Payment received — your balance updates automatically as soon as it's confirmed, usually within a minute.
        </div>
      )}
      {upiOrder ? (
        <UpiPaymentPanel paymentUrl={upiOrder.paymentUrl} amount={upiOrder.amount} onCancel={() => setUpiOrder(null)} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr] lg:items-start">
            <section className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-4">
              <StepHeading step={1} title="Enter Deposit Amount" />
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-[color:var(--acc-text-secondary)]" aria-hidden="true" strokeWidth={2.2} />
                <input
                  type="number"
                  step="1"
                  min={MIN_DEPOSIT}
                  max={MAX_DEPOSIT}
                  aria-label="Deposit amount"
                  aria-invalid={!!errors.amount}
                  className="w-full rounded-[var(--acc-radius-md)] border py-2.5 pr-4 pl-10 text-lg font-semibold outline-none focus:border-[color:var(--acc-accent)]"
                  style={{ background: "var(--acc-input-bg)", color: "var(--acc-input-fg)", borderColor: "var(--acc-input-border)" }}
                  {...register("amount")}
                />
              </div>
              <p className="mt-1.5 text-xs text-[color:var(--acc-text-secondary)]">
                Min: {formatInr(MIN_DEPOSIT)} Max: {formatInr(MAX_DEPOSIT)}
              </p>
              {errors.amount && (
                <p role="alert" className="mt-1 text-sm" style={{ color: "var(--acc-danger)" }}>
                  {errors.amount.message}
                </p>
              )}

              <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                {quickAmounts.map((preset) => {
                  const active = numericAmount === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setValue("amount", preset as unknown as DepositInput["amount"], { shouldValidate: true })}
                      aria-pressed={active}
                      className="rounded-[var(--acc-radius-md)] border px-2 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                      style={active ? { background: "var(--acc-accent)", borderColor: "var(--acc-accent)", color: "var(--acc-accent-fg)" } : { borderColor: "var(--acc-border)", color: "var(--acc-text-primary)" }}
                    >
                      {formatInr(preset)}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4">
                <h3 className="mb-1.5 text-sm font-semibold text-[color:var(--acc-text-primary)]">Bonus Coupon (Optional)</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="WELCOME"
                    aria-label="Bonus coupon code"
                    className="flex-1 rounded-[var(--acc-radius-md)] border px-3 py-2 text-sm font-semibold uppercase outline-none focus:border-[color:var(--acc-accent)]"
                    style={{ background: "var(--acc-input-bg)", color: "var(--acc-input-fg)", borderColor: "var(--acc-input-border)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setCouponMessage("Coupons aren't available yet — this deposit will go through without a bonus.")}
                    className="rounded-[var(--acc-radius-md)] px-4 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                    style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
                  >
                    Apply
                  </button>
                </div>
                {couponMessage && (
                  <div className="mt-2">
                    <ComingSoon message={couponMessage} />
                  </div>
                )}
              </div>
            </section>

            {/* Payment Method (step 2) and the Payment Summary breakdown (step 3,
                below) are desktop-only — mobile goes straight from the amount
                (step 1) to the Deposit button, no intermediate steps to tap
                through. The button itself, and any error, still show on mobile. */}
            <section className="hidden rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-4 lg:block">
              <StepHeading step={2} title="Payment Method" />
              <p className="flex items-start gap-2 text-sm text-[color:var(--acc-text-secondary)]">
                <QrCode className="mt-0.5 size-4.5 shrink-0" style={{ color: "var(--acc-accent)" }} aria-hidden="true" strokeWidth={2.1} />
                You'll be redirected to a secure payment page to scan a QR code and complete payment. Your balance updates automatically once it's confirmed.
              </p>
            </section>
          </div>

          <section className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-4">
            <div className="hidden lg:block">
              <StepHeading step={3} title="Payment Summary" />
              <div className="flex flex-col gap-2 text-sm">
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
                <div className="mt-1 flex items-center justify-between border-t border-[color:var(--acc-border-soft)] pt-2">
                  <span className="text-sm font-semibold text-[color:var(--acc-text-primary)]">Total Payable</span>
                  <span className="text-lg font-semibold" style={{ color: "var(--acc-accent)" }}>
                    {formatInr(totalPayable)}
                  </span>
                </div>
              </div>
            </div>

            {deposit.isError && (
              <p role="alert" className="mt-3 text-sm" style={{ color: "var(--acc-danger)" }}>
                {friendlyErrorMessage(deposit.error instanceof ApiError ? deposit.error : deposit.error)}
              </p>
            )}

            <button
              type="submit"
              disabled={deposit.isPending}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--acc-radius-md)] text-sm font-semibold outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-7"
              style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
            >
              <CreditCard className="size-4.5" aria-hidden="true" strokeWidth={2.2} />
              {deposit.isPending ? "Redirecting…" : "Proceed to Deposit"}
            </button>
          </section>
        </form>
      )}
    </div>
  )
}
