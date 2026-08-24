/**
 * Single source of truth for every image upload in the app (support ticket
 * attachments, KYC documents) — mirrors backend/src/lib/uploads.ts exactly.
 * This is client-side UX only (instant "that file's too big" feedback
 * before ever hitting the network); the backend enforces the same limits
 * regardless and is what's actually authoritative.
 */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
