-- Add last_included_history_at to snapshot_manifest
ALTER TABLE "snapshot_manifest"
ADD COLUMN "last_included_history_at" DATETIME NOT NULL;
