import type { Request } from "express"

/**
 * Express 5's ParamsDictionary types every value as `string | string[]` to
 * account for repeated wildcard segments (e.g. ":x*") — none of these
 * routes use that pattern, every :id/:playerId here is a single path
 * segment and always a plain string at runtime.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name]
  return Array.isArray(value) ? value[0] : value
}
