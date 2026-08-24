export type KycStatus = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED"

export type Gender = "MALE" | "FEMALE" | "OTHER"

export interface Profile {
  username: string
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  /** ISO date (YYYY-MM-DD), not a full timestamp — dates of birth have no time component. */
  dateOfBirth: string | null
  /** Drives which avatar badge UserAvatar renders — "OTHER" for accounts that haven't set it. */
  gender: Gender
  currency: string
  memberSince: string
  kycStatus: KycStatus
  phoneVerified: boolean
}

export interface UpdateProfileInput {
  username?: string
  firstName?: string | null
  lastName?: string | null
  dateOfBirth?: string | null
  gender?: Gender
}
