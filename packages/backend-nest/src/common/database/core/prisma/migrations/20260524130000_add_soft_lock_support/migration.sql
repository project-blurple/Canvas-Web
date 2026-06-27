-- AlterTable
ALTER TABLE "canvas" ADD COLUMN "place_state" TEXT NOT NULL DEFAULT 'no_one';

-- Update existing canvases to use the new place state
UPDATE "canvas" SET "place_state" = 'no_one' WHERE "locked" = TRUE;
UPDATE "canvas" SET "place_state" = 'anyone' WHERE "locked" = FALSE;

-- Drop the old locked column
ALTER TABLE "canvas" DROP COLUMN "locked";
