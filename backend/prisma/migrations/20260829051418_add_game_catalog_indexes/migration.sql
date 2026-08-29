-- CreateIndex
CREATE INDEX "games_enabled_categoryId_idx" ON "games"("enabled", "categoryId");

-- CreateIndex
CREATE INDEX "games_enabled_providerId_idx" ON "games"("enabled", "providerId");
