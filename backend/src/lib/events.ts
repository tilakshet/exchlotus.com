import { EventEmitter } from "node:events"

export interface AppEvents {
  "wallet:changed": (payload: { playerExternalId: string; balance: number }) => void
  /** A new login elsewhere just revoked this player's other sessions (auth.service.ts) — socket.server.ts pushes an immediate kick to any of their still-open connections on top of requireAuth's per-request enforcement. */
  "session:revoked": (payload: { playerExternalId: string }) => void
}

/**
 * Small in-process event bus so modules that shouldn't import each other
 * directly (wallet.service and the Socket.IO layer) can still communicate.
 * Fine for a single instance; once this runs on more than one process,
 * replace with the Redis pub/sub adapter Socket.IO already supports
 * (see socket.server.ts) rather than this EventEmitter.
 */
class TypedEventEmitter extends EventEmitter {
  override emit<K extends keyof AppEvents>(event: K, ...args: Parameters<AppEvents[K]>): boolean {
    return super.emit(event, ...args)
  }
  override on<K extends keyof AppEvents>(event: K, listener: AppEvents[K]): this {
    return super.on(event, listener)
  }
}

export const appEvents = new TypedEventEmitter()
