-- AlterTable
ALTER TABLE "games" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "lastNotificationsViewedAt" TIMESTAMP(3);
