-- CreateTable
CREATE TABLE "timelapse_manifest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "canvas_id" INTEGER NOT NULL,
    "requested_start_at" DATETIME,
    "requested_end_at" DATETIME,
    "effective_start_at" DATETIME NOT NULL,
    "effective_end_at" DATETIME NOT NULL,
    "bounds_x0" INTEGER,
    "bounds_y0" INTEGER,
    "bounds_x1" INTEGER,
    "bounds_y1" INTEGER,
    "scale" INTEGER NOT NULL,
    "frame_rate" INTEGER NOT NULL,
    "end_hold_duration_ms" INTEGER NOT NULL,
    "show_end_card" BOOLEAN NOT NULL DEFAULT 1,
    "background_color" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "invalidated_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

CREATE INDEX "timelapse_manifest_canvas_id_effective_start_at_effective_end_at_idx"
ON "timelapse_manifest"("canvas_id", "effective_start_at", "effective_end_at");

CREATE UNIQUE INDEX "timelapse_manifest_cache_key_key"
ON "timelapse_manifest"("cache_key");
