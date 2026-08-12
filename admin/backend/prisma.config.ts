import "dotenv/config"
import { defineConfig, env } from "prisma/config"

// Points at the platform's one shared schema/migration history
// (backend/prisma/schema.prisma) — admin/backend never owns its own
// migrations, it only generates its own client from that single source
// of truth (see the `adminClient` generator block in that schema file).
export default defineConfig({
  schema: "../../backend/prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
})
