import { useState, type FormEvent } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { KeyRound, Loader2, ShieldHalf } from "lucide-react"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiError } from "@/api/api-error"
import type { MfaChallenge } from "@/types/auth"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  const { login, verifyMfa } = useAdminAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await login(email, password)
      if (result.mfaRequired) {
        setChallenge(result as MfaChallenge)
      } else {
        navigate({ to: "/dashboard" })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault()
    if (!challenge) return
    setError(null)
    setSubmitting(true)
    try {
      await verifyMfa(challenge.challengeToken, code)
      navigate({ to: "/dashboard" })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldHalf className="size-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold tracking-wide text-foreground">Exchlotus Admin</p>
          <p className="text-xs text-muted-foreground">Platform Operations Control Center</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-foreground">
              {challenge && <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />}
              {challenge ? "Enter your authenticator code" : "Sign in"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!challenge ? (
              <form className="flex flex-col gap-3" onSubmit={handlePasswordSubmit}>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground" htmlFor="email">
                    Email
                  </label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus autoComplete="username" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground" htmlFor="password">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                {error && (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" disabled={submitting} className="mt-1">
                  {submitting && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            ) : (
              <form className="flex flex-col gap-3" onSubmit={handleMfaSubmit}>
                <p className="text-xs text-muted-foreground">Open your authenticator app and enter the current 6-digit code.</p>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground" htmlFor="code">
                    6-digit code
                  </label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoFocus
                    className="text-center text-lg tracking-[0.4em]"
                  />
                </div>
                {error && (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" disabled={submitting} className="mt-1">
                  {submitting && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {submitting ? "Verifying…" : "Verify"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setChallenge(null)}>
                  Back
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
