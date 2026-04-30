-- CreateTable
CREATE TABLE "notice" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "header" TEXT,
    "content" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "persist_on_dismiss" BOOLEAN NOT NULL DEFAULT false,
    "canvas_id" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notice"
ADD CONSTRAINT "notice_canvas_id_fkey"
FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "notice_canvas_id_idx" ON "notice"("canvas_id");

-- Make the existing DB match the current Prisma schema.
UPDATE "discord_user_profile"
SET "profile_picture_url" = 'https://discord.com/assets/788f05731f8aa02e.png'
WHERE "profile_picture_url" IS NULL;

UPDATE "info"
SET "cached_canvas_ids" = '{}'::integer[]
WHERE "cached_canvas_ids" IS NULL;

UPDATE "info"
SET "default_canvas_id" = (SELECT "id" FROM "canvas" ORDER BY "id" LIMIT 1)
WHERE "default_canvas_id" IS NULL;

ALTER TABLE "discord_user_profile"
ALTER COLUMN "profile_picture_url" SET NOT NULL;

ALTER TABLE "info"
ALTER COLUMN "cached_canvas_ids" SET NOT NULL,
ALTER COLUMN "default_canvas_id" SET NOT NULL;
