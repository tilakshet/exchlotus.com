-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REGISTERED', 'QUALIFIED', 'REWARDED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralRiskStatus" AS ENUM ('NORMAL', 'REVIEW', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ReferralRiskFlagType" AS ENUM ('SELF_REFERRAL', 'DUPLICATE_DEVICE', 'DUPLICATE_IP', 'RAPID_REGISTRATION', 'SUSPICIOUS_PATTERN', 'MULTIPLE_ACCOUNTS', 'UNUSUAL_ACTIVITY');

-- CreateEnum
CREATE TYPE "ReferralQualificationRule" AS ENUM ('REGISTRATION_ONLY', 'VERIFICATION', 'DEPOSIT', 'ACTIVITY', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "ReferralCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "ReferralRewardTxType" AS ENUM ('REFERRAL_CASH_REWARD', 'REFERRAL_COIN_REWARD', 'REFERRAL_REVERSAL', 'REFERRAL_EXPIRY', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReferralRewardTxStatus" AS ENUM ('COMPLETED', 'REVERSED', 'EXPIRED');

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "referralCode" TEXT;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "bonusCoinBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "referral_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "qualificationRule" "ReferralQualificationRule" NOT NULL DEFAULT 'REGISTRATION_ONLY',
    "minDepositAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "minActivityAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "referrerCashReward" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "referrerCoinReward" INTEGER NOT NULL DEFAULT 0,
    "referredCashReward" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "referredCoinReward" INTEGER NOT NULL DEFAULT 0,
    "rewardExpiryDays" INTEGER,
    "maxRewardsPerUser" INTEGER,
    "maxReferredPerUser" INTEGER,
    "dailyReferralLimit" INTEGER,
    "monthlyReferralLimit" INTEGER,
    "minAccountAgeDays" INTEGER NOT NULL DEFAULT 0,
    "kycRequired" BOOLEAN NOT NULL DEFAULT false,
    "rewardCooldownHours" INTEGER NOT NULL DEFAULT 0,
    "allowedCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "termsText" TEXT,
    "updatedByAdminId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "ReferralCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "qualificationRule" "ReferralQualificationRule" NOT NULL DEFAULT 'REGISTRATION_ONLY',
    "referrerCashReward" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "referrerCoinReward" INTEGER NOT NULL DEFAULT 0,
    "referredCashReward" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "referredCoinReward" INTEGER NOT NULL DEFAULT 0,
    "minDepositAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "minActivityAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "maxRewards" INTEGER,
    "expiryDays" INTEGER,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "campaignId" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'REGISTERED',
    "riskStatus" "ReferralRiskStatus" NOT NULL DEFAULT 'NORMAL',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "registrationIp" TEXT,
    "registrationUserAgent" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifiedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_risk_flags" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "type" "ReferralRiskFlagType" NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_risk_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_reward_transactions" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "type" "ReferralRewardTxType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "balanceBefore" DECIMAL(18,2),
    "balanceAfter" DECIMAL(18,2),
    "status" "ReferralRewardTxStatus" NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "reversalOfId" TEXT,
    "actorAdminId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_reward_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referral_campaigns_status_startAt_endAt_idx" ON "referral_campaigns"("status", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredId_key" ON "referrals"("referredId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "referrals_campaignId_idx" ON "referrals"("campaignId");

-- CreateIndex
CREATE INDEX "referrals_riskStatus_idx" ON "referrals"("riskStatus");

-- CreateIndex
CREATE INDEX "referral_risk_flags_referralId_idx" ON "referral_risk_flags"("referralId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_reward_transactions_reference_key" ON "referral_reward_transactions"("reference");

-- CreateIndex
CREATE INDEX "referral_reward_transactions_playerId_idx" ON "referral_reward_transactions"("playerId");

-- CreateIndex
CREATE INDEX "referral_reward_transactions_referralId_idx" ON "referral_reward_transactions"("referralId");

-- CreateIndex
CREATE INDEX "referral_reward_transactions_status_idx" ON "referral_reward_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "players_referralCode_key" ON "players"("referralCode");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "referral_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_risk_flags" ADD CONSTRAINT "referral_risk_flags_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_reward_transactions" ADD CONSTRAINT "referral_reward_transactions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_reward_transactions" ADD CONSTRAINT "referral_reward_transactions_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

