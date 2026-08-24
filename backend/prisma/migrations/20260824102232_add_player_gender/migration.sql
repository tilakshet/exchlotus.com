-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'OTHER';
