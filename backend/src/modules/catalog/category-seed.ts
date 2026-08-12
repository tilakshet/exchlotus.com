/**
 * Categories are no longer a curated/hardcoded list — the provider's game
 * catalog carries its own category name per game (GameV2.category), so we
 * derive our Category rows from that at sync time (see catalog.service.ts
 * syncCatalog). This file just turns a provider-supplied category name into
 * the stable `code` our Category table keys on.
 */
export function slugifyCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
}
