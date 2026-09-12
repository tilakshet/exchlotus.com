-- AlterTable
ALTER TABLE "wallets"
    ADD COLUMN IF NOT EXISTS "protectedPrincipal" DECIMAL(18,2) NOT NULL DEFAULT 0;
