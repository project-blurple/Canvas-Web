-- CreateTable
CREATE TABLE "snapshot_manifest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "canvas_id" INTEGER NOT NULL,
    "snapshot_at" DATETIME NOT NULL,
    "history_count" INTEGER NOT NULL DEFAULT 0,
    "last_included_history_at" DATETIME NOT NULL,
    "image_path" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "snapshot_cursor" (
    "canvas_id" INTEGER NOT NULL PRIMARY KEY,
    "last_processed_timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dirty_from_timestamp" DATETIME,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "snapshot_manifest_canvas_id_snapshot_at_key"
ON "snapshot_manifest"("canvas_id", "snapshot_at");
