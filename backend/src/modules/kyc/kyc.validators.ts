import { z } from "zod"

// Standard Indian PAN format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).
// This is a format check only — confirming the string is shaped like a real
// PAN before it's even worth sending to QRX (see qrx-pan.service.ts), which
// does the actual verification against the Income Tax Department's records.
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/

export const verifyPanSchema = z.object({
  pan: z.string().trim().toUpperCase().regex(PAN_REGEX, "Please enter a valid PAN number."),
})
