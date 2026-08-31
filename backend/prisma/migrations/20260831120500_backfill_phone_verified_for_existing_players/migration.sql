-- Data migration: KYC's mobile OTP verification step was removed (identity
-- is now proven by KYC document review instead), and phone ownership is
-- treated as established at registration time going forward (see
-- auth.service.ts register(), which now sets phoneVerifiedAt on create).
-- Existing accounts created before this change never went through that new
-- registration-time set, so without this backfill they'd be permanently
-- stuck on submitKyc's phoneVerifiedAt gate with no remaining way to clear
-- it. Only touches accounts that have a phone on file and aren't already
-- verified (OTP-signup accounts already have phoneVerifiedAt set).
UPDATE "players" SET "phoneVerifiedAt" = "createdAt" WHERE "phone" IS NOT NULL AND "phoneVerifiedAt" IS NULL;
