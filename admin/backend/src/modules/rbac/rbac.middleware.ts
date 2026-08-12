import type { NextFunction, Request, Response } from "express"
import { AdminApiError, statusForError } from "../../lib/api-error"
import type { PermissionCode } from "./permissions"

/**
 * Server-side enforcement — the ONLY place a permission check actually
 * matters (CLAUDE.md/master spec: "Hiding a button in React is NOT
 * security"). Reads req.adminAuth, set by requireAdminAuth
 * (auth/admin-auth.middleware.ts), which is always mounted first.
 */
export function requirePermission(code: PermissionCode) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.adminAuth) {
      const err = new AdminApiError("UNAUTHENTICATED", "No admin session on request")
      return res.status(statusForError(err)).json({ error: err.code })
    }
    if (!req.adminAuth.permissions.includes(code)) {
      const err = new AdminApiError("FORBIDDEN", `Missing permission: ${code}`)
      return res.status(statusForError(err)).json({ error: err.code, permission: code })
    }
    next()
  }
}
