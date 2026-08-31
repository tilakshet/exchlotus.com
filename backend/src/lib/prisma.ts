import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { env } from "./env"

// `max` defaults to 10 (node-postgres's own default) when unset — every
// request in this process, including the gaming provider's webhook calls,
// shares this one pool. Confirmed in production logs: most
// /api/gaming_webhook calls respond in 0-3ms, but under concurrent load a
// minority queue for a free connection and take 1-6+ seconds — plausibly
// enough to trip the gaming provider's own "webhook didn't answer in time"
// check on real-money launches. 20 leaves headroom under Postgres's default
// max_connections (100) alongside admin/backend's separate pool and any
// direct psql access.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, max: 20 })

export const prisma = new PrismaClient({ adapter })
