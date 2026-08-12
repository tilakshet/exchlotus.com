# Build context is the repo root (see docker-compose.prod.yml) — this image
# is the single nginx "edge" for BOTH domain.com (this app) and
# admin.domain.com (admin/frontend), so it needs both apps' source. This is
# a deliberate one-VPS convenience (see admin/frontend/Dockerfile's own
# header comment for the fully-independent alternative this trades away).
FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/. .

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM node:20-alpine AS admin-builder
WORKDIR /app

COPY admin/frontend/package.json admin/frontend/package-lock.json ./
RUN npm ci

COPY admin/frontend/. .

ARG VITE_ADMIN_API_BASE_URL=""
ENV VITE_ADMIN_API_BASE_URL=$VITE_ADMIN_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=admin-builder /app/dist /usr/share/nginx/html-admin
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80 443
