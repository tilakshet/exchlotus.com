-- CreateEnum
CREATE TYPE "LoginEventMethod" AS ENUM ('PASSWORD', 'OTP', 'REGISTER');

-- CreateEnum
CREATE TYPE "LoginEventResult" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "login_events" (
    "id" TEXT NOT NULL,
    "playerId" TEXT,
    "phone" TEXT NOT NULL,
    "method" "LoginEventMethod" NOT NULL,
    "result" "LoginEventResult" NOT NULL,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_events_playerId_createdAt_idx" ON "login_events"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "login_events_phone_createdAt_idx" ON "login_events"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "login_events_createdAt_idx" ON "login_events"("createdAt");

-- AddForeignKey
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
