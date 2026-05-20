ALTER TABLE "frame"
ADD COLUMN "owner_user_id" BIGINT,
ADD COLUMN "owner_guild_id" BIGINT;

UPDATE "frame"
SET "owner_user_id" = "owner_id"
WHERE "is_guild_owned" = FALSE;

UPDATE "frame"
SET "owner_guild_id" = "owner_id"
WHERE "is_guild_owned" = TRUE;

ALTER TABLE "frame"
DROP COLUMN "owner_id",
DROP COLUMN "is_guild_owned";
