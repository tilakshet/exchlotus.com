-- DropIndex
DROP INDEX "games_enabled_categoryId_idx";

-- DropIndex
DROP INDEX "games_enabled_providerId_idx";

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "availableFromProvider" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "games_enabled_availableFromProvider_categoryId_idx" ON "games"("enabled", "availableFromProvider", "categoryId");

-- CreateIndex
CREATE INDEX "games_enabled_availableFromProvider_providerId_idx" ON "games"("enabled", "availableFromProvider", "providerId");
