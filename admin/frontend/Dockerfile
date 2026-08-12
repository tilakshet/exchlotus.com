# Standalone build for admin/frontend as its OWN nginx-served container —
# not what docker-compose.prod.yml actually wires up today (it builds this
# app INTO the shared frontend/ nginx edge image instead, see
# frontend/Dockerfile's admin-builder stage and its header comment for why).
# This file is the independent-deploy path: point admin.domain.com's DNS at
# a container built from this image instead, once the admin app outgrows
# sharing infra with the player frontend (master spec §48's "later, if the
# platform grows" path). Its own nginx.conf.template listens on plain HTTP
# only (no TLS) since it assumes something in front of it terminates TLS.
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_ADMIN_API_BASE_URL=""
ENV VITE_ADMIN_API_BASE_URL=$VITE_ADMIN_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80 443
