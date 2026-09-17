-- Broadens the referral-only reward ledger into a general bonus ledger for
-- the new bonus system (welcome bonus, referral join/first-deposit bonus,
-- coin conversion). Split into two migrations because ALTER TYPE ... ADD
-- VALUE cannot run in the same transaction as a statement that references
-- the new value (see 20260916130100_add_bonus_system_part2).

-- RenameEnum
ALTER TYPE "ReferralRewardTxType" RENAME TO "BonusTransactionType";
ALTER TYPE "ReferralRewardTxStatus" RENAME TO "BonusTransactionStatus";

-- AlterEnum
ALTER TYPE "BonusTransactionType" ADD VALUE 'WELCOME_BONUS';
ALTER TYPE "BonusTransactionType" ADD VALUE 'REFERRAL_JOIN_BONUS';
ALTER TYPE "BonusTransactionType" ADD VALUE 'REFERRAL_FIRST_DEPOSIT_BONUS';
ALTER TYPE "BonusTransactionType" ADD VALUE 'BONUS_CONVERSION';
ALTER TYPE "BonusTransactionType" ADD VALUE 'BONUS_ADJUSTMENT';
ALTER TYPE "BonusTransactionType" ADD VALUE 'BONUS_REVERSAL';
