import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertCircle, CheckCircle2, KeyRound, Loader2, ShieldCheck, User } from "lucide-react"
import { useProfile, useUpdateProfile } from "@/hooks/useProfile"
import { useChangePassword } from "@/hooks/useChangePassword"
import { ApiError, friendlyErrorMessage } from "@/api/api-error"
import { ComingSoon } from "@/features/account/ComingSoon"

export const Route = createFileRoute("/dashboard/account/profile")({
  component: ProfilePage,
})

type Tab = "info" | "password" | "verification"

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "info", label: "Info", icon: User },
  { id: "password", label: "Change Password", icon: KeyRound },
  { id: "verification", label: "Verification", icon: ShieldCheck },
]

const inputClass = "w-full rounded-[var(--acc-radius-md)] border px-4 py-3.5 text-base font-medium outline-none focus:border-[color:var(--acc-accent)] disabled:opacity-60"
const inputStyle = { background: "var(--acc-input-bg)", color: "var(--acc-input-fg)", borderColor: "var(--acc-input-border)" } as const

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-base font-semibold text-[color:var(--acc-text-primary)]">{label}</label>
      {children}
    </div>
  )
}

const infoSchema = z.object({
  username: z.string().min(2).max(40),
  firstName: z.string().max(60).optional().or(z.literal("")),
  lastName: z.string().max(60).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
})
type InfoValues = z.infer<typeof infoSchema>

function InfoTab() {
  const { data: profile, isLoading, isError, refetch } = useProfile()
  const updateProfile = useUpdateProfile()
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    values: profile
      ? { username: profile.username, firstName: profile.firstName ?? "", lastName: profile.lastName ?? "", dateOfBirth: profile.dateOfBirth ?? "" }
      : undefined,
  })

  async function onSubmit(values: InfoValues) {
    setSaved(false)
    try {
      await updateProfile.mutateAsync({
        username: values.username,
        firstName: values.firstName || null,
        lastName: values.lastName || null,
        dateOfBirth: values.dateOfBirth || null,
      })
      setSaved(true)
    } catch {
      // Surfaced via updateProfile.isError below.
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-[color:var(--acc-text-secondary)]">
        <Loader2 className="size-5.5 animate-spin" aria-hidden="true" />
        Loading profile…
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div role="alert" className="flex items-center justify-between gap-2 rounded-[var(--acc-radius-sm)] bg-[color:var(--acc-danger-bg)] px-3 py-2.5 text-sm text-[color:var(--acc-danger)]">
        <span className="flex items-center gap-2">
          <AlertCircle className="size-5.5 shrink-0" aria-hidden="true" />
          Couldn't load profile.
        </span>
        <button type="button" onClick={() => refetch()} className="font-medium underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Field label="Username">
          <input className={inputClass} style={inputStyle} aria-invalid={!!errors.username} {...register("username")} />
          {errors.username && (
            <p role="alert" className="mt-1 text-sm text-[color:var(--acc-danger)]">
              {errors.username.message}
            </p>
          )}
        </Field>

        <Field label="Email">
          <input className={inputClass} style={inputStyle} value={profile.email ?? "Not set"} disabled />
          <p className="mt-1 text-sm text-[color:var(--acc-text-secondary)]">Email isn't editable here yet.</p>
        </Field>

        <Field label="First Name">
          <input className={inputClass} style={inputStyle} {...register("firstName")} />
        </Field>

        <Field label="Last Name">
          <input className={inputClass} style={inputStyle} {...register("lastName")} />
        </Field>

        <Field label="Date Of Birth">
          <input type="date" className={inputClass} style={inputStyle} {...register("dateOfBirth")} />
        </Field>

        <Field label="Mobile Number">
          <input className={inputClass} style={inputStyle} value={profile.phone ?? "Not set"} disabled />
          <p className="mt-1 text-sm text-[color:var(--acc-text-secondary)]">Mobile number isn't editable here — it's tied to sign-in.</p>
        </Field>
      </div>

      {updateProfile.isError && (
        <p role="alert" className="text-base text-[color:var(--acc-danger)]">
          {friendlyErrorMessage(updateProfile.error instanceof ApiError ? updateProfile.error : updateProfile.error)}
        </p>
      )}
      {saved && !updateProfile.isPending && (
        <p role="status" className="flex items-center gap-2 text-base font-medium text-[color:var(--acc-success-fg)]">
          <CheckCircle2 className="size-5.5" aria-hidden="true" />
          Profile updated
        </p>
      )}

      <button
        type="submit"
        disabled={updateProfile.isPending}
        className="h-13 w-full rounded-[var(--acc-radius-md)] text-base font-bold outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-10"
        style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
      >
        {updateProfile.isPending ? "Saving…" : "Update"}
      </button>
    </form>
  )
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "At least 8 characters").max(72),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] })
type PasswordValues = z.infer<typeof passwordSchema>

function PasswordTab() {
  const changePassword = useChangePassword()
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  async function onSubmit(values: PasswordValues) {
    setDone(false)
    try {
      await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      setDone(true)
      reset()
    } catch {
      // Surfaced via changePassword.isError below.
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-md flex-col gap-5">
      <Field label="Current Password">
        <input type="password" className={inputClass} style={inputStyle} aria-invalid={!!errors.currentPassword} {...register("currentPassword")} />
        {errors.currentPassword && (
          <p role="alert" className="mt-1 text-sm text-[color:var(--acc-danger)]">
            {errors.currentPassword.message}
          </p>
        )}
      </Field>
      <Field label="New Password">
        <input type="password" className={inputClass} style={inputStyle} aria-invalid={!!errors.newPassword} {...register("newPassword")} />
        {errors.newPassword && (
          <p role="alert" className="mt-1 text-sm text-[color:var(--acc-danger)]">
            {errors.newPassword.message}
          </p>
        )}
      </Field>
      <Field label="Confirm New Password">
        <input type="password" className={inputClass} style={inputStyle} aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
        {errors.confirmPassword && (
          <p role="alert" className="mt-1 text-sm text-[color:var(--acc-danger)]">
            {errors.confirmPassword.message}
          </p>
        )}
      </Field>

      {changePassword.isError && (
        <p role="alert" className="text-base text-[color:var(--acc-danger)]">
          {friendlyErrorMessage(changePassword.error instanceof ApiError ? changePassword.error : changePassword.error)}
        </p>
      )}
      {done && (
        <p role="status" className="flex items-center gap-2 text-base font-medium text-[color:var(--acc-success-fg)]">
          <CheckCircle2 className="size-5.5" aria-hidden="true" />
          Password changed
        </p>
      )}

      <button
        type="submit"
        disabled={changePassword.isPending}
        className="h-13 w-full rounded-[var(--acc-radius-md)] text-base font-bold outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-10"
        style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
      >
        {changePassword.isPending ? "Saving…" : "Change Password"}
      </button>
    </form>
  )
}

function ProfilePage() {
  const [tab, setTab] = useState<Tab>("info")

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Profile sections" className="flex flex-wrap gap-2.5">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className="flex h-11 items-center gap-2 rounded-[var(--acc-radius-full)] border px-5 text-base font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
              style={active ? { background: "var(--acc-accent)", borderColor: "var(--acc-accent)", color: "var(--acc-accent-fg)" } : { background: "var(--acc-surface)", borderColor: "var(--acc-border)", color: "var(--acc-text-primary)" }}
            >
              <Icon className="size-5.5" aria-hidden="true" strokeWidth={2.1} />
              {label}
            </button>
          )
        })}
      </div>

      <section className="rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6">
        {tab === "info" && <InfoTab />}
        {tab === "password" && <PasswordTab />}
        {tab === "verification" && <ComingSoon message="KYC verification isn't available yet." />}
      </section>
    </div>
  )
}
