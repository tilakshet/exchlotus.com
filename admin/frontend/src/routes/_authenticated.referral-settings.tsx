import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getReferralSettings, updateReferralSettings, type ReferralSettings } from "@/api/referrals.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { ApiError } from "@/api/api-error"
import { PageHeader } from "@/components/shared/PageHeader"
import { ErrorState } from "@/components/shared/ErrorState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const Route = createFileRoute("/_authenticated/referral-settings")({
  component: ReferralSettingsPage,
})

type FormState = Omit<ReferralSettings, "id" | "updatedAt">

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

/** No <Switch> component exists in this admin UI yet (see StatusBadge/Select as the only form primitives available) — a plain checkbox is the honest minimal choice rather than introducing a new dependency for one field. */
function BoolField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 rounded border-input" />
      {label}
    </label>
  )
}

function NullableNumberField({ label, hint, value, onChange }: { label: string; hint?: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        min={0}
        value={value ?? ""}
        placeholder="No limit"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </Field>
  )
}

function ReferralSettingsPage() {
  const { hasPermission } = useAdminAuth()
  const canManage = hasPermission("referral-settings.manage")
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["referral-settings"], queryFn: getReferralSettings })
  const [form, setForm] = useState<FormState | null>(null)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const mutation = useMutation({
    mutationFn: (input: FormState) => updateReferralSettings(input),
    onSuccess: (updated) => {
      setForm(updated)
      queryClient.invalidateQueries({ queryKey: ["referral-settings"] })
      toast({ title: "Settings saved", variant: "success" })
    },
    onError: (err) => toast({ title: "Save failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  if (isError) return <ErrorState title="Unable to load referral settings" onRetry={() => refetch()} />
  if (isLoading || !form) return <div className="text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader title="Refer & Earn Settings" description="Global defaults — a running campaign overrides these for referrals attributed during its window." back={{ label: "Referrals", to: "/referrals" }} />

      <BoolField label="Enable Refer & Earn" checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Qualification rule">
          <Select value={form.qualificationRule} onValueChange={(v) => setForm({ ...form, qualificationRule: v as FormState["qualificationRule"] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REGISTRATION_ONLY">Registration only</SelectItem>
              <SelectItem value="VERIFICATION">Registration + KYC verified</SelectItem>
              <SelectItem value="DEPOSIT">Registration + minimum deposit</SelectItem>
              <SelectItem value="ACTIVITY">Registration + minimum activity</SelectItem>
              <SelectItem value="MULTIPLE">Registration + deposit + activity</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <BoolField label="Also require KYC approved (any rule)" checked={form.kycRequired} onChange={(v) => setForm({ ...form, kycRequired: v })} />

        <Field label="Minimum deposit (₹)" hint="Used by DEPOSIT/MULTIPLE rules">
          <Input type="number" min={0} value={form.minDepositAmount} onChange={(e) => setForm({ ...form, minDepositAmount: Number(e.target.value) })} />
        </Field>
        <Field label="Minimum qualifying activity (₹)" hint="Used by ACTIVITY/MULTIPLE rules">
          <Input type="number" min={0} value={form.minActivityAmount} onChange={(e) => setForm({ ...form, minActivityAmount: Number(e.target.value) })} />
        </Field>

        <Field label="Referrer cash reward (₹)">
          <Input type="number" min={0} value={form.referrerCashReward} onChange={(e) => setForm({ ...form, referrerCashReward: Number(e.target.value) })} />
        </Field>
        <Field label="Referrer coin reward">
          <Input type="number" min={0} value={form.referrerCoinReward} onChange={(e) => setForm({ ...form, referrerCoinReward: Number(e.target.value) })} />
        </Field>
        <Field label="Referred-user cash reward (₹)">
          <Input type="number" min={0} value={form.referredCashReward} onChange={(e) => setForm({ ...form, referredCashReward: Number(e.target.value) })} />
        </Field>
        <Field label="Referred-user coin reward">
          <Input type="number" min={0} value={form.referredCoinReward} onChange={(e) => setForm({ ...form, referredCoinReward: Number(e.target.value) })} />
        </Field>

        <NullableNumberField label="Reward expiry (days)" hint="Blank = never expires" value={form.rewardExpiryDays} onChange={(v) => setForm({ ...form, rewardExpiryDays: v })} />
        <NullableNumberField label="Max rewards per user" value={form.maxRewardsPerUser} onChange={(v) => setForm({ ...form, maxRewardsPerUser: v })} />
        <NullableNumberField label="Max referred users per referrer" value={form.maxReferredPerUser} onChange={(v) => setForm({ ...form, maxReferredPerUser: v })} />
        <NullableNumberField label="Daily referral limit" value={form.dailyReferralLimit} onChange={(v) => setForm({ ...form, dailyReferralLimit: v })} />
        <NullableNumberField label="Monthly referral limit" value={form.monthlyReferralLimit} onChange={(v) => setForm({ ...form, monthlyReferralLimit: v })} />

        <Field label="Minimum account age (days)">
          <Input type="number" min={0} value={form.minAccountAgeDays} onChange={(e) => setForm({ ...form, minAccountAgeDays: Number(e.target.value) })} />
        </Field>
        <Field label="Reward cooldown (hours)">
          <Input type="number" min={0} value={form.rewardCooldownHours} onChange={(e) => setForm({ ...form, rewardCooldownHours: Number(e.target.value) })} />
        </Field>
      </div>

      <Field label="Terms & conditions text" hint="Shown to players on the Refer & Earn page">
        <textarea
          className="min-h-28 w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={form.termsText ?? ""}
          onChange={(e) => setForm({ ...form, termsText: e.target.value || null })}
        />
      </Field>

      {canManage && (
        <div>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      )}
    </div>
  )
}
