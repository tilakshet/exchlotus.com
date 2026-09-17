import { env } from "../../lib/env"

const addressSchema = {
  building_name: "building_name",
  locality: "locality",
  street_name: "street_name",
  pincode: "pincode",
  city: "city",
  state: "state",
  country: "country",
} as const

export interface QrxPanDetails {
  pan: string
  pan_type?: string
  fullname?: string
  first_name?: string
  middle_name?: string
  last_name?: string
  gender?: string
  aadhaar_number?: string
  aadhaar_linked?: boolean
  dob?: string
  address?: Partial<Record<keyof typeof addressSchema, string>>
  mobile?: string
  email?: string
}

export interface QrxPanVerificationResult {
  details: QrxPanDetails
  requestId: string | null
}

export class QrxPanError extends Error {
  constructor(public readonly code: "UNAVAILABLE" | "INVALID_RESPONSE" | "NOT_VERIFIED", message: string) {
    super(message)
    this.name = "QrxPanError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function mapDetails(value: unknown): QrxPanDetails | null {
  if (!isRecord(value)) return null
  const pan = optionalString(value.pan)
  if (!pan) return null
  const rawAddress = isRecord(value.address) ? value.address : undefined
  const address = rawAddress
    ? Object.fromEntries(
        Object.keys(addressSchema)
          .map((key) => [key, optionalString(rawAddress[key])])
          .filter((entry): entry is [string, string] => entry[1] !== undefined)
      )
    : undefined

  return {
    pan,
    pan_type: optionalString(value.pan_type),
    fullname: optionalString(value.fullname),
    first_name: optionalString(value.first_name),
    middle_name: optionalString(value.middle_name),
    last_name: optionalString(value.last_name),
    gender: optionalString(value.gender),
    aadhaar_number: optionalString(value.aadhaar_number),
    aadhaar_linked: typeof value.aadhaar_linked === "boolean" ? value.aadhaar_linked : undefined,
    dob: optionalString(value.dob),
    address: address as QrxPanDetails["address"],
    mobile: optionalString(value.mobile),
    email: optionalString(value.email),
  }
}

export async function verifyPanWithQrx(pan: string): Promise<QrxPanVerificationResult> {
  if (!env.QRX_CLIENT_ID || !env.QRX_SECRET_ID) {
    throw new QrxPanError("UNAVAILABLE", "PAN verification service is not configured")
  }

  let response: Response
  try {
    response = await fetch(`${env.QRX_PAN_BASE_URL}/qrx/verify_pan_details`, {
      method: "POST",
      signal: AbortSignal.timeout(env.QRX_TIMEOUT_MS),
      headers: {
        clientid: env.QRX_CLIENT_ID,
        secretid: env.QRX_SECRET_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ pan }),
    })
  } catch {
    throw new QrxPanError("UNAVAILABLE", "PAN verification service is temporarily unavailable")
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new QrxPanError("INVALID_RESPONSE", "PAN verification service returned an invalid response")
  }

  if (!response.ok) {
    throw new QrxPanError("UNAVAILABLE", "PAN verification service is temporarily unavailable")
  }
  if (!isRecord(body) || body.status !== true || body.status_key !== "SUCCESS") {
    throw new QrxPanError("NOT_VERIFIED", "PAN verification failed")
  }

  const details = mapDetails(body.data)
  if (!details) throw new QrxPanError("INVALID_RESPONSE", "PAN verification service returned incomplete data")

  return {
    details,
    requestId: optionalString(body.request_id) ?? null,
  }
}
