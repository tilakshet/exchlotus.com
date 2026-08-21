#!/bin/bash
# One-time SSL bootstrap. Run this once from the repo root on the VPS,
# after DNS for $DOMAIN AND www.$DOMAIN already point at this server (an A
# or CNAME record for the "www" host is required — this script doesn't
# create it, and the cert request below fails without it) and before the
# first `docker compose -f docker-compose.prod.yml up -d`.
#
# Nginx refuses to start with `ssl_certificate` pointing at files that don't
# exist yet, and Let's Encrypt's webroot challenge needs nginx already
# serving that webroot — so this bootstraps with a self-signed placeholder
# cert first, brings nginx up against that, requests the real cert through
# it, then reloads nginx onto the real one.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.production ]; then
  set -a
  source .env.production
  set +a
fi

: "${DOMAIN:?set DOMAIN in .env.production}"
: "${LETSENCRYPT_EMAIL:?set LETSENCRYPT_EMAIL in .env.production}"

COMPOSE="docker compose --env-file .env.production -f docker-compose.prod.yml"

# Admin platform gets its OWN certificate at its OWN domain (admin.$DOMAIN)
# — the shared frontend/ nginx edge (see frontend/nginx.conf.template)
# terminates TLS for both domain.com and admin.domain.com from the same
# container, but as two separate Let's Encrypt certs, not one multi-SAN
# cert, so either can be renewed/revoked independently later.
ADMIN_DOMAIN="admin.$DOMAIN"

echo "== Creating dummy self-signed certificates for $DOMAIN and $ADMIN_DOMAIN =="
$COMPOSE run --rm --entrypoint "\
  mkdir -p /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/live/$ADMIN_DOMAIN && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost' && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$ADMIN_DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$ADMIN_DOMAIN/fullchain.pem \
    -subj '/CN=localhost'" certbot

echo "== Starting nginx with the dummy certificates =="
$COMPOSE up -d frontend

echo "== Deleting dummy certificates =="
$COMPOSE run --rm --entrypoint "rm -rf \
  /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf \
  /etc/letsencrypt/live/$ADMIN_DOMAIN /etc/letsencrypt/archive/$ADMIN_DOMAIN /etc/letsencrypt/renewal/$ADMIN_DOMAIN.conf" certbot

echo "== Requesting real certificate for $DOMAIN (and www.$DOMAIN) from Let's Encrypt =="
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    -d $DOMAIN -d www.$DOMAIN \
    --email $LETSENCRYPT_EMAIL --agree-tos --no-eff-email" certbot

echo "== Requesting real certificate for $ADMIN_DOMAIN from Let's Encrypt =="
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    -d $ADMIN_DOMAIN \
    --email $LETSENCRYPT_EMAIL --agree-tos --no-eff-email" certbot

echo "== Reloading nginx with the real certificates =="
$COMPOSE restart frontend

echo "Done. $DOMAIN and $ADMIN_DOMAIN are now serving over HTTPS."
