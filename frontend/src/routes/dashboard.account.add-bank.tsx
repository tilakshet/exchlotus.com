import { useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Landmark, ShieldCheck } from "lucide-react"
import { useBankAccounts } from "@/hooks/useBankAccounts"

export const Route = createFileRoute("/dashboard/account/add-bank")({
  component: AddBankPage,
})

const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/

const bankSchema = z
  .object({
    accountHolderName: z.string().trim().min(2, "Enter the account holder's name"),
    bankName: z.string().trim().min(2, "Enter the bank name"),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{9,18}$/, "Account number must be 9–18 digits"),
    confirmAccountNumber: z.string().trim(),
    ifsc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(ifscPattern, "Enter a valid IFSC code (e.g. HDFC0001234)"),
  })
  .refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: "Account numbers don't match",
    path: ["confirmAccountNumber"],
  })
type BankValues = z.infer<typeof bankSchema>

const inputClass = "w-full rounded-[var(--acc-radius-md)] border px-4 py-3.5 text-base font-medium outline-none focus:border-[color:var(--acc-accent)] disabled:opacity-60"
const inputStyle = { background: "var(--acc-input-bg)", color: "var(--acc-input-fg)", borderColor: "var(--acc-input-border)" } as const

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-semibold text-[color:var(--acc-text-primary)]">
        {label}
      </label>
      {children}
    </div>
  )
}

/**
 * Real add/save/persist flow (localStorage-backed, see useBankAccounts) —
 * not a form that pretends to submit somewhere. There's no bank
 * verification or payout-gateway backend, so this is explicitly framed as
 * saving payout details for reference, not as a verified bank link.
 */
function AddBankPage() {
  const { addAccount } = useBankAccounts()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BankValues>({ resolver: zodResolver(bankSchema) })

  async function onSubmit(values: BankValues) {
    setSaving(true)
    addAccount({
      accountHolderName: values.accountHolderName,
      bankName: values.bankName,
      accountNumber: values.accountNumber,
      ifsc: values.ifsc.toUpperCase(),
    })
    navigate({ to: "/dashboard/account/withdraw" })
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        to="/dashboard/account/withdraw"
        className="inline-flex items-center gap-2 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
        style={{ color: "var(--acc-text-secondary)" }}
      >
        <ArrowLeft className="size-5.5" aria-hidden="true" strokeWidth={2.2} />
        Back to Withdraw
      </Link>

      <section className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6">
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--acc-accent-soft)", color: "var(--acc-accent)" }}>
            <Landmark className="size-6.5" aria-hidden="true" strokeWidth={2.1} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-[color:var(--acc-text-primary)]">Add Bank Account</h2>
            <p className="text-sm text-[color:var(--acc-text-secondary)]">Saved for your withdrawal payout details.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <Field id="bank-account-holder" label="Account Holder Name">
            <input id="bank-account-holder" className={inputClass} style={inputStyle} placeholder="As per bank records" aria-invalid={!!errors.accountHolderName} {...register("accountHolderName")} />
            {errors.accountHolderName && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.accountHolderName.message}
              </p>
            )}
          </Field>

          <Field id="bank-name" label="Bank Name">
            <input id="bank-name" className={inputClass} style={inputStyle} placeholder="e.g. HDFC Bank" aria-invalid={!!errors.bankName} {...register("bankName")} />
            {errors.bankName && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.bankName.message}
              </p>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="bank-account-number" label="Account Number">
              <input id="bank-account-number" inputMode="numeric" className={inputClass} style={inputStyle} placeholder="Account number" aria-invalid={!!errors.accountNumber} {...register("accountNumber")} />
              {errors.accountNumber && (
                <p role="alert" className="mt-1 text-sm text-red-600">
                  {errors.accountNumber.message}
                </p>
              )}
            </Field>

            <Field id="bank-account-number-confirm" label="Confirm Account Number">
              <input
                id="bank-account-number-confirm"
                inputMode="numeric"
                className={inputClass}
                style={inputStyle}
                placeholder="Re-enter account number"
                aria-invalid={!!errors.confirmAccountNumber}
                {...register("confirmAccountNumber")}
              />
              {errors.confirmAccountNumber && (
                <p role="alert" className="mt-1 text-sm text-red-600">
                  {errors.confirmAccountNumber.message}
                </p>
              )}
            </Field>
          </div>

          <Field id="bank-ifsc" label="IFSC Code">
            <input
              id="bank-ifsc"
              className={`${inputClass} uppercase`}
              style={inputStyle}
              placeholder="e.g. HDFC0001234"
              aria-invalid={!!errors.ifsc}
              {...register("ifsc")}
            />
            {errors.ifsc && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.ifsc.message}
              </p>
            )}
          </Field>

          <p className="flex items-start gap-2 text-sm text-[color:var(--acc-text-secondary)]">
            <ShieldCheck className="mt-0.5 size-4.5 shrink-0" style={{ color: "var(--acc-accent)" }} aria-hidden="true" />
            Saved on this device for your reference when withdrawing — there's no bank verification or payout gateway in this build, so withdrawals still credit your in-app balance directly rather than transferring to this account.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="h-13 w-full rounded-[var(--acc-radius-md)] text-base font-bold outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-10"
            style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
          >
            Save Bank Account
          </button>
        </form>
      </section>
    </div>
  )
}
