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
// multer's diskStorage doesn't create its destination — without this, the
// first upload after a fresh volume/checkout (see docker-compose.prod.yml's
// exchlotus_uploads volume) fails with ENOENT.
fs.mkdirSync(SUPPORT_UPLOAD_DIR, { recursive: true })

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SUPPORT_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

class UnsupportedImageTypeError extends Error {}

const supportImageUpload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) return cb(new UnsupportedImageTypeError())
    cb(null, true)
  },
}).single("image")

/**
 * Wraps multer's callback-style middleware in a promise so the controller
 * can await it and translate failures into the app's normal
 * VALIDATION_ERROR response shape, instead of multer's error propagating to
 * the generic 500 handler in app.ts (which is right for unexpected server
 * errors, wrong for "you uploaded a 20MB file" / "you uploaded a .exe").
 */
export function parseSupportImageUpload(req: import("express").Request, res: import("express").Response): Promise<{ error?: string }> {
  return new Promise((resolve) => {
    supportImageUpload(req, res, (err: unknown) => {
      if (err instanceof UnsupportedImageTypeError) return resolve({ error: "Only JPEG, PNG, WEBP, or GIF images are allowed." })
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") return resolve({ error: `Image must be under ${MAX_IMAGE_BYTES / 1024 / 1024}MB.` })
      if (err) return resolve({ error: "Could not process the uploaded image." })
      resolve({})
    })
  })
}

/** Builds the absolute, publicly-fetchable URL for an uploaded support image — see SupportMessage.attachmentUrl in schema.prisma for why this must be absolute (admin/frontend is a different domain). */
export function supportImageUrl(filename: string): string {
  return `${env.PUBLIC_BASE_URL}/api/uploads/support/${filename}`
}
