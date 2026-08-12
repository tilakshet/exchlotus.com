# Build context is the repo root (see docker-compose.prod.yml) — admin/backend
# generates its Prisma client from the single shared schema at
# backend/prisma/schema.prisma (see that file's `adminClient` generator
# block), so this build needs access to backend/prisma too, not just its
# own admin/backend/ directory.
FROM node:20-alpine AS builder
WORKDIR /repo

COPY admin/backend/package.json admin/backend/package-lock.json ./admin/backend/
RUN cd admin/backend && npm ci

COPY backend/prisma ./backend/prisma
COPY admin/backend/prisma.config.ts ./admin/backend/prisma.config.ts
# Only the adminClient generator — the plain `client` generator's default
# output resolves against backend/node_modules, which isn't present in
# this build context (and isn't this image's concern; backend/Dockerfile
# generates that one for itself). DATABASE_URL is a placeholder: `generate`
# only needs a syntactically valid connection string, never a live one.
RUN cd admin/backend && DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder" npx prisma generate --generator adminClient

COPY admin/backend/tsconfig.json ./admin/backend/tsconfig.json
COPY admin/backend/src ./admin/backend/src
RUN cd admin/backend && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /repo/admin/backend/package.json /repo/admin/backend/package-lock.json ./
COPY --from=builder /repo/admin/backend/node_modules ./node_modules
COPY --from=builder /repo/admin/backend/dist ./dist
# The generated Prisma client is plain JS/.d.ts, not compiled from .ts by
# tsc — it has to be copied into dist/ by hand so the compiled
# `require("../generated/prisma")` in dist/lib/prisma.js resolves at the
# same relative depth it did against src/ during development.
COPY --from=builder /repo/admin/backend/src/generated ./dist/generated

EXPOSE 4600
CMD ["node", "dist/server.js"]
