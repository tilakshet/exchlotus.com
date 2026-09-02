-- CreateTable
CREATE TABLE "game_launch_failures" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_launch_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_launch_failures_gameId_createdAt_idx" ON "game_launch_failures"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "game_launch_failures_playerId_createdAt_idx" ON "game_launch_failures"("playerId", "createdAt");

-- AddForeignKey
ALTER TABLE "game_launch_failures" ADD CONSTRAINT "game_launch_failures_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

