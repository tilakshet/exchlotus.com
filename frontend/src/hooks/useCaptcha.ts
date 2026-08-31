import { useCallback, useEffect, useState } from "react"
import * as authApi from "@/api/auth.api"
import { ApiError, friendlyErrorMessage } from "@/api/api-error"

/**
 * Numeric CAPTCHA state for one form — fetches a fresh challenge on mount
 * and exposes a refresh() for the "reload" affordance. `code` is the
 * server-generated digits meant to be shown on screen (see backend
 * captcha.service.ts); `value`/`setValue` is the user's retyped answer,
 * checked server-side by whichever endpoint the form submits to.
 */
export function useCaptcha() {
  const [captchaId, setCaptchaId] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setValue("")
    setError(null)
    try {
      const captcha = await authApi.getCaptcha()
      setCaptchaId(captcha.captchaId)
      setCode(captcha.code)
    } catch (err) {
      // Previously swallowed silently — the field just showed "····"
      // forever with no way to tell a real failure (backend/Redis down)
      // apart from "still loading". Surface it so the form's refresh
      // button actually does something visible, instead of retrying the
      // exact same failing request with no feedback.
      setCaptchaId(null)
      setCode(null)
      setError(friendlyErrorMessage(err instanceof ApiError ? err : err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { captchaId, code, value, setValue, refresh, loading, error }
}

export type CaptchaState = ReturnType<typeof useCaptcha>
