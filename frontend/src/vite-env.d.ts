/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /** Optional — unset hides that icon in LandingFooter instead of linking to "#". */
  readonly VITE_SOCIAL_TELEGRAM_URL?: string
  readonly VITE_SOCIAL_X_URL?: string
  readonly VITE_SOCIAL_INSTAGRAM_URL?: string
  readonly VITE_SOCIAL_DISCORD_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
