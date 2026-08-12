import { apiRequest } from "./http"
import type { Profile, UpdateProfileInput } from "@/types/profile"

export function getProfile(): Promise<Profile> {
  return apiRequest<Profile>("/api/profile")
}

// Email/phone aren't included — they're identity fields tied to login, not
// editable here (see backend profile.controller.ts).
export function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  return apiRequest<Profile>("/api/profile", { method: "PATCH", body: input })
}
