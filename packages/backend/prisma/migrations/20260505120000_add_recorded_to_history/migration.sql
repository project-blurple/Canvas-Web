-- Add the soft-delete flag to history entries.
ALTER TABLE "history"
ADD COLUMN "recorded" BOOLEAN NOT NULL DEFAULT TRUE;
