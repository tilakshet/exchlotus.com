import { z } from "zod"

// Standard Indian PAN format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).
// This is a format check only — confirming the string is shaped like a real
// PAN, not a verification against the Income Tax Department's actual
// database (that needs a third-party verification API this build doesn't
// have credentials for; see the KYC review flow this feeds into instead).
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/

export const submitKycSchema = z.object({
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PAN_REGEX, "Enter a valid PAN number (format: ABCDE1234F)"),
})
