import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import multer from "multer"
import { env } from "./env"

/**
 * Local-disk file storage — the first (and so far only) upload feature in
 * this codebase, so there's no existing S3/object-storage client to reuse.
 * Fine for the current single-backend-container deployment (see
 * docker-compose.prod.yml — one `backend` replica); would need to move to
 * shared/object storage before this could ever run as multiple replicas
 * behind a load balancer, since each container would otherwise only see the
 * files uploaded to itself.
 */
const UPLOAD_ROOT = path.join(process.cwd(), "uploads")
export const SUPPORT_UPLOAD_DIR = path.join(UPLOAD_ROOT, "support")
/// PAN card scans + KYC selfies — unlike SUPPORT_UPLOAD_DIR, never exposed
/// through a public static route (see app.ts). admin-backend reads these
/// off the same exchlotus_uploads volume through its own authenticated
/// document-streaming route (admin/backend's kyc.controller.ts), not by
/// asking this process for them.
export const KYC_UPLOAD_DIR = path.join(UPLOAD_ROOT, "kyc")
// multer's diskStorage doesn't create its destination — without this, the
// first upload after a fresh volume/checkout (see docker-compose.prod.yml's
// exchlotus_uploads volume) fails with ENOENT.
fs.mkdirSync(SUPPORT_UPLOAD_DIR, { recursive: true })
fs.mkdirSync(KYC_UPLOAD_DIR, { recursive: true })

/**
 * Single source of truth for every upload feature in the app (support
 * ticket attachments, KYC documents) — one limit/allow-list, not a copy per
 * feature that can silently drift. The frontend mirrors these exact values
 * from frontend/src/lib/upload-limits.ts for instant client-side feedback,
 * but this is the one that's actually enforced.
 */
export const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
// A genuine photo/scan is never this small — anything under this is either
// a blank/corrupt file or someone probing the upload with garbage.
const MIN_IMAGE_BYTES = 512

class UnsupportedImageTypeError extends Error {}
class InvalidImageContentError extends Error {}
class ImageTooSmallError extends Error {}

/**
 * Client-declared `mimetype`/filename extension are just form-data headers
 * the caller fully controls — trusting them lets someone upload literally
 * any file with a spoofed `Content-Type: image/jpeg`. This checks the
 * actual file signature (the first few bytes every real image format is
 * required to start with), which cannot be forged without the result
 * failing to decode as an image everywhere else too.
 */
function sniffImageType(buf: Buffer): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg"
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png"
  if (buf.length >= 6 && (buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a")) return "image/gif"
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp"
  return null
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
}

/**
 * Buffered in memory (5MB cap, so this is never a meaningful memory
 * pressure concern) rather than streamed straight to disk — sniffing the
 * real file signature and choosing the stored extension from *that* (never
 * from the attacker-controlled original filename) requires having the
 * bytes in hand before anything is written.
 */
function buildUpload(maxFiles: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: maxFiles },
    fileFilter: (_req, file, cb) => {
      // Cheap early rejection on the declared type — not trusted on its
      // own, but avoids buffering an upload that's obviously wrong before
      // the real signature check below runs.
      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) return cb(new UnsupportedImageTypeError())
      cb(null, true)
    },
  })
}

/** Sniffs, size-floors, and persists one already-buffered upload to `dir`. Throws InvalidImageContentError/ImageTooSmallError on failure. */
function persistValidatedImage(file: Express.Multer.File, dir: string): string {
  if (file.buffer.length < MIN_IMAGE_BYTES) throw new ImageTooSmallError()
  const detected = sniffImageType(file.buffer)
  if (!detected) throw new InvalidImageContentError()
  const filename = `${crypto.randomUUID()}${EXTENSION_BY_MIME[detected]}`
  fs.writeFileSync(path.join(dir, filename), file.buffer)
  return filename
}

const supportImageUpload = buildUpload(1).single("image")

/**
 * Wraps multer's callback-style middleware in a promise so the controller
 * can await it and translate failures into the app's normal
 * VALIDATION_ERROR response shape, instead of multer's error propagating to
 * the generic 500 handler in app.ts (which is right for unexpected server
 * errors, wrong for "you uploaded a 20MB file" / "you uploaded a .exe").
 */
export function parseSupportImageUpload(req: import("express").Request, res: import("express").Response): Promise<{ error?: string; filename?: string }> {
  return new Promise((resolve) => {
    supportImageUpload(req, res, (err: unknown) => {
      if (err instanceof UnsupportedImageTypeError) return resolve({ error: "Only JPEG, PNG, WEBP, or GIF images are allowed." })
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") return resolve({ error: `Image must be under ${MAX_IMAGE_BYTES / 1024 / 1024}MB.` })
      if (err) return resolve({ error: "Could not process the uploaded image." })

      const file = req.file
      if (!file) return resolve({}) // support attachments are optional

      try {
        resolve({ filename: persistValidatedImage(file, SUPPORT_UPLOAD_DIR) })
      } catch (e) {
        if (e instanceof ImageTooSmallError) return resolve({ error: "That image looks empty or corrupted — please try another." })
        resolve({ error: "That file isn't a valid JPEG, PNG, WEBP, or GIF image." })
      }
    })
  })
}

/** Builds the absolute, publicly-fetchable URL for an uploaded support image — see SupportMessage.attachmentUrl in schema.prisma for why this must be absolute (admin/frontend is a different domain). */
export function supportImageUrl(filename: string): string {
  return `${env.PUBLIC_BASE_URL}/api/uploads/support/${filename}`
}

const kycUpload = buildUpload(2).fields([
  { name: "panCard", maxCount: 1 },
  { name: "photo", maxCount: 1 },
])

/** Same wrapping approach as parseSupportImageUpload — see its doc comment. */
export function parseKycUpload(
  req: import("express").Request,
  res: import("express").Response
): Promise<{ error?: string; files?: { panCard: string; photo: string } }> {
  return new Promise((resolve) => {
    kycUpload(req, res, (err: unknown) => {
      if (err instanceof UnsupportedImageTypeError) return resolve({ error: "Only JPEG, PNG, WEBP, or GIF images are allowed." })
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") return resolve({ error: `Each image must be under ${MAX_IMAGE_BYTES / 1024 / 1024}MB.` })
      if (err) return resolve({ error: "Could not process the uploaded images." })

      const files = req.files as { panCard?: Express.Multer.File[]; photo?: Express.Multer.File[] } | undefined
      const panCard = files?.panCard?.[0]
      const photo = files?.photo?.[0]
      if (!panCard || !photo) return resolve({ error: "Both a PAN card image and a profile photo are required." })

      // The two fields serving the same bytes back (re-uploading the PAN
      // card image as the "profile photo," accidentally or otherwise) means
      // one of the two required documents was never actually provided.
      if (panCard.buffer.equals(photo.buffer)) {
        return resolve({ error: "Your PAN card and profile photo can't be the same image — please upload two different photos." })
      }

      try {
        const panCardFilename = persistValidatedImage(panCard, KYC_UPLOAD_DIR)
        const photoFilename = persistValidatedImage(photo, KYC_UPLOAD_DIR)
        resolve({ files: { panCard: panCardFilename, photo: photoFilename } })
      } catch (e) {
        if (e instanceof ImageTooSmallError) return resolve({ error: "One of those images looks empty or corrupted — please try again." })
        resolve({ error: "Both files must be valid JPEG, PNG, WEBP, or GIF images." })
      }
    })
  })
}
