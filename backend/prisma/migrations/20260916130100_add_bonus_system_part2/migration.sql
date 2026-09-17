-- RenameTable
ALTER TABLE "referral_reward_transactions" RENAME TO "bonus_transactions";
ALTER TABLE "bonus_transactions" RENAME CONSTRAINT "referral_reward_transactions_pkey" TO "bonus_transactions_pkey";

-- RenameIndex
ALTER INDEX "referral_reward_transactions_reference_key" RENAME TO "bonus_transactions_reference_key";
ALTER INDEX "referral_reward_transactions_playerId_idx" RENAME TO "bonus_transactions_playerId_idx";
ALTER INDEX "referral_reward_transactions_referralId_idx" RENAME TO "bonus_transactions_referralId_idx";
ALTER INDEX "referral_reward_transactions_status_idx" RENAME TO "bonus_transactions_status_idx";

-- RenameForeignKey
ALTER TABLE "bonus_transactions" RENAME CONSTRAINT "referral_reward_transactions_playerId_fkey" TO "bonus_transactions_playerId_fkey";
ALTER TABLE "bonus_transactions" RENAME CONSTRAINT "referral_reward_transactions_referralId_fkey" TO "bonus_transactions_referralId_fkey";

-- AlterTable
-- referralId becomes optional: welcome bonus and coin conversion events
-- aren't tied to a referral.
ALTER TABLE "bonus_transactions" ALTER COLUMN "referralId" DROP NOT NULL;
ALTER TABLE "bonus_transactions" ADD COLUMN "relatedDepositId" TEXT;

-- AlterTable
-- Display-only mirror of protectedPrincipal, scoped to bonus conversions —
-- see the Wallet.bonusPlayableBalance doc comment in schema.prisma.
ALTER TABLE "wallets" ADD COLUMN "bonusPlayableBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;
