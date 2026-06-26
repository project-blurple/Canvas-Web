UPDATE "discord_user_profile"
SET "profile_picture_url" = 'https://discord.com/assets/788f05731f8aa02e.png'
WHERE "profile_picture_url" IS NULL;

UPDATE "info"
SET "cached_canvas_ids" = '{}'::integer[]
WHERE "cached_canvas_ids" IS NULL;

UPDATE "info"
SET "default_canvas_id" = (SELECT "id" FROM "canvas" ORDER BY "id" LIMIT 1)
WHERE "default_canvas_id" IS NULL;

UPDATE "blacklist"
SET "date_added" = NOW()
WHERE "date_added" IS NULL;

ALTER TABLE "color"
ALTER COLUMN "emoji_name" DROP NOT NULL,
ALTER COLUMN "emoji_id" DROP NOT NULL;

ALTER TABLE "discord_user_profile"
ALTER COLUMN "profile_picture_url" SET NOT NULL;

ALTER TABLE "info"
ALTER COLUMN "cached_canvas_ids" SET NOT NULL,
ALTER COLUMN "default_canvas_id" SET NOT NULL;

ALTER TABLE public.guild DROP CONSTRAINT IF EXISTS guild_id_fkey;
