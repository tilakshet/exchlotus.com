import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertCircle, CheckCircle2, Clock, ShieldCheck } from "lucide-react"
import { useMyKyc, useVerifyPan } from "@/hooks/useKyc"
import { ApiError, friendlyErrorMessage } from "@/api/api-error"
import { StepHeading } from "@/features/account/StepHeading"

export const Route = createFileRoute("/dashboard/account/kyc")({
  component: KycPage,
})

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/

const kycSchema = z.object({
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PAN_REGEX, "Enter a valid PAN number (format: ABCDE1234F)"),
})
type KycValues = z.infer<typeof kycSchema>

const inputClass = "w-full rounded-[var(--acc-radius-md)] border px-4 py-3.5 text-base font-medium uppercase outline-none focus:border-[color:var(--acc-accent)] disabled:opacity-60"
const inputStyle = { background: "var(--acc-input-bg)", color: "var(--acc-input-fg)", borderColor: "var(--acc-input-border)" } as const

function StatusBanner({ icon: Icon, bg, fg, title, description }: { icon: typeof CheckCircle2; bg: string; fg: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--acc-radius-lg)] px-6 py-5" style={{ background: bg, color: fg }}>
      <Icon className="mt-0.5 size-6 shrink-0" aria-hidden="true" strokeWidth={2.1} />
      <div>
        <p className="text-lg font-bold">{title}</p>
        <p className="mt-0.5 text-sm opacity-90">{description}</p>
      </div>
    </div>
  )
}


function KycForm({ onDone }: { onDone: () => void }) {
  const verify = useVerifyPan()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KycValues>({ resolver: zodResolver(kycSchema) })

  async function onSubmit(values: KycValues) {
    setFormError(null)
    try {
      await verify.mutateAsync(values.panNumber)
      onDone()
    } catch (err) {
      setFormError(friendlyErrorMessage(err instanceof ApiError ? err : err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6">
      <StepHeading step={1} title="Verify PAN" />

      <div>
        <label htmlFor="kyc-pan" className="mb-2 block text-base font-semibold text-[color:var(--acc-text-primary)]">
          PAN Number
        </label>
        <input id="kyc-pan" className={inputClass} style={inputStyle} placeholder="ABCDE1234F" maxLength={10} aria-invalid={!!errors.panNumber} {...register("panNumber")} />
        {errors.panNumber && (
          <p role="alert" className="mt-1 text-sm" style={{ color: "var(--acc-danger)" }}>
            {errors.panNumber.message}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm" style={{ color: "var(--acc-danger)" }}>
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={verify.isPending}
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-[var(--acc-radius-md)] text-lg font-bold outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-10"
        style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
      >
        <ShieldCheck className="size-5.5" aria-hidden="true" strokeWidth={2.2} />
        {verify.isPending ? "Verifying PAN…" : "Verify PAN"}
      </button>
    </form>
  )
}

/**
 * Defensive fallback only — every account has phoneVerifiedAt set at
 * registration now (see auth.service.ts register()), and a data migration
 * backfilled every pre-existing account, so this shouldn't be reachable in
 * practice. There's no self-service OTP step to send someone to anymore
 * (that flow was removed — see kyc.service.ts), hence a support pointer
 * instead of a dead "Send Code" button.
 */
function PhoneNotVerifiedNotice() {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6">
      <StepHeading step={1} title="Mobile Number Not Verified" />
      <p className="text-base text-[color:var(--acc-text-secondary)]">
        We couldn't confirm your mobile number on this account. Please contact support to resolve this before submitting KYC documents.
      </p>
    </div>
  )
}

function KycPage() {
  const { data, isLoading, isError, refetch } = useMyKyc()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {isLoading && <p className="text-[color:var(--acc-text-secondary)]">Loading…</p>}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] p-10 text-center">
          <p className="text-[color:var(--acc-text-secondary)]">Couldn't load your KYC status.</p>
          <button type="button" onClick={() => refetch()} className="text-sm font-semibold underline" style={{ color: "var(--acc-accent)" }}>
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          {data.status === "APPROVED" && (
            <div className="flex flex-col gap-3">
              <StatusBanner icon={CheckCircle2} bg="var(--acc-success-bg)" fg="var(--acc-success-fg)" title="PAN Verified Successfully" description="Your identity has been verified — withdrawals are unlocked." />
              {data.latestSubmission && (
                <div className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-5 text-sm text-[color:var(--acc-text-secondary)]">
                  <p><strong>Name:</strong> {data.latestSubmission.fullName ?? "Not provided"}</p>
                  <p><strong>PAN:</strong> {data.latestSubmission.pan.slice(0, 5)}****{data.latestSubmission.pan.slice(-1)}</p>
                  <p><strong>Status:</strong> KYC Verified</p>
                </div>
              )}
            </div>
          )}

          {data.status === "PENDING" && (
            <StatusBanner
              icon={Clock}
              bg="var(--acc-pending-bg)"
              fg="var(--acc-pending-fg)"
              title="Under review"
              description="Your documents were submitted and are waiting on admin review. This page will update once it's decided."
            />
          )}

          {data.status === "REJECTED" && (
            <>
              <StatusBanner
                icon={AlertCircle}
                bg="var(--acc-danger-bg)"
                fg="var(--acc-danger)"
                title="Verification rejected"
                description={data.latestSubmission?.rejectionReason || "Your submission was rejected. Please review and resubmit."}
              />
              {data.phoneVerified ? <KycForm onDone={() => refetch()} /> : <PhoneNotVerifiedNotice />}
            </>
          )}

          {data.status === "NOT_SUBMITTED" && (
            <>
              <div className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-5 text-base text-[color:var(--acc-text-secondary)]">
                Verify your identity with your mobile number and PAN. This is required once, before your first withdrawal — deposits and gameplay aren't affected.
              </div>
              {data.phoneVerified ? <KycForm onDone={() => refetch()} /> : <PhoneNotVerifiedNotice />}
            </>
          )}
        </>
      )}
    </div>
  )
}
