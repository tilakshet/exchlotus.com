-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "KycVerificationSource" AS ENUM ('MANUAL', 'QRX_PAN_API');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "kyc_submissions"
    ALTER COLUMN "panCardFile" DROP NOT NULL,
    ALTER COLUMN "photoFile" DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS "panType" TEXT,
    ADD COLUMN IF NOT EXISTS "fullName" TEXT,
    ADD COLUMN IF NOT EXISTS "firstName" TEXT,
    ADD COLUMN IF NOT EXISTS "middleName" TEXT,
    ADD COLUMN IF NOT EXISTS "lastName" TEXT,
    ADD COLUMN IF NOT EXISTS "gender" TEXT,
    ADD COLUMN IF NOT EXISTS "aadhaarNumber" TEXT,
    ADD COLUMN IF NOT EXISTS "aadhaarLinked" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "buildingName" TEXT,
    ADD COLUMN IF NOT EXISTS "locality" TEXT,
    ADD COLUMN IF NOT EXISTS "streetName" TEXT,
    ADD COLUMN IF NOT EXISTS "pincode" TEXT,
    ADD COLUMN IF NOT EXISTS "city" TEXT,
    ADD COLUMN IF NOT EXISTS "state" TEXT,
    ADD COLUMN IF NOT EXISTS "country" TEXT,
    ADD COLUMN IF NOT EXISTS "mobile" TEXT,
    ADD COLUMN IF NOT EXISTS "email" TEXT,
    ADD COLUMN IF NOT EXISTS "verificationSource" "KycVerificationSource" NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN IF NOT EXISTS "provider" TEXT,
    ADD COLUMN IF NOT EXISTS "providerRequestId" TEXT,
    ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kyc_submissions_providerRequestId_idx" ON "kyc_submissions"("providerRequestId");

-- Keep the newest approved record when older local/manual data contains
-- duplicate PANs or multiple approved submissions for one player. This makes
-- the new uniqueness guarantees compatible with existing data without
-- silently changing the player's final approved state.
WITH duplicate_pans AS (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "panNumber" ORDER BY "createdAt" DESC, "id" DESC) AS row_number
    FROM "kyc_submissions"
    WHERE "status" = 'APPROVED'
)
UPDATE "kyc_submissions"
SET "status" = 'REJECTED',
    "rejectionReason" = 'Superseded duplicate approved KYC record',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM duplicate_pans WHERE row_number > 1);

WITH duplicate_players AS (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "playerId" ORDER BY "createdAt" DESC, "id" DESC) AS row_number
    FROM "kyc_submissions"
    WHERE "status" = 'APPROVED'
)
UPDATE "kyc_submissions"
SET "status" = 'REJECTED',
    "rejectionReason" = 'Superseded duplicate approved KYC record',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM duplicate_players WHERE row_number > 1);

CREATE UNIQUE INDEX "kyc_submissions_approved_panNumber_key"
    ON "kyc_submissions"("panNumber")
    WHERE "status" = 'APPROVED';
CREATE UNIQUE INDEX "kyc_submissions_approved_playerId_key"
    ON "kyc_submissions"("playerId")
    WHERE "status" = 'APPROVED';
