import { env } from "../../../lib/env"

type TokenFields = {
  token?: string
  access_token?: string
  accessToken?: string
  api_token?: string
  bearer_token?: string
  bearerToken?: string
}
type TokenEnvelope = { success?: boolean; data?: TokenFields; message?: string } & TokenFields
type CreateEnvelope = { success?: boolean; data?: { reference?: string; status?: string; payment_url?: string; expires_at?: string }; message?: string }

let cachedToken: { value: string; expiresAt: number } | undefined

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value
  if (!env.VERAPAY_CLIENT_KEY || !env.VERAPAY_CLIENT_SECRET) throw new Error("Verapay credentials are not configured")
  const response = await fetch(`${env.VERAPAY_BASE_URL}/api/auth/api-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_key: env.VERAPAY_CLIENT_KEY, secret_key: env.VERAPAY_CLIENT_SECRET }),
  })
  const result = await response.json() as TokenEnvelope
  const token =
    result.data?.token ?? result.data?.access_token ?? result.data?.accessToken ?? result.data?.api_token ??
    result.data?.bearer_token ?? result.data?.bearerToken ?? result.token ?? result.access_token ??
    result.accessToken ?? result.api_token ?? result.bearer_token ?? result.bearerToken
  // Some auth APIs omit the `success` field while still returning a valid
  // token (the response message may say "Token issued."). A token plus a 2xx
  // response is sufficient unless the API explicitly reports success:false.
  if (!response.ok || result.success === false || !token) {
    const fields = Object.keys(result.data ?? result).join(", ") || "none"
    const reason = result.message ?? "Verapay token request failed"
    throw new Error(`${reason} (HTTP ${response.status}; response fields: ${fields})`)
  }
  cachedToken = { value: token, expiresAt: Date.now() + 50 * 60_000 }
  return token
}

export async function createVerapayPayin(input: {
  amount: number; orderId: string; name: string; email?: string; phone: string; returnUrl: string
}) {
  const token = await getToken()
  const response = await fetch(`${env.VERAPAY_BASE_URL}/api/v1/payins/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amount.toFixed(2), currency: "INR", merchant_order_id: input.orderId,
      end_customer_name: input.name,
      ...(input.email ? { end_customer_email: input.email } : {}),
      end_customer_phone: input.phone, return_url: input.returnUrl,
    }),
  })
  const result = await response.json() as CreateEnvelope
  if (!response.ok || !result.success || !result.data?.reference || !result.data.payment_url) {
    throw new Error(result.message ?? "Verapay could not create the PayIn")
  }
  return { reference: result.data.reference, paymentUrl: result.data.payment_url, expiresAt: result.data.expires_at }
}
