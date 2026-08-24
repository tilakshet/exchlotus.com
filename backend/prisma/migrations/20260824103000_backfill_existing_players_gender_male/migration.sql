-- Data migration: accounts created before the Gender column existed all
-- landed on the "OTHER" default (see 20260824102232_add_player_gender).
-- Per product decision, backfill those pre-existing accounts to MALE so
-- their avatar shows the male badge instead of the neutral one. New
-- registrations already collect gender explicitly and are unaffected.
UPDATE "players" SET "gender" = 'MALE' WHERE "gender" = 'OTHER';
