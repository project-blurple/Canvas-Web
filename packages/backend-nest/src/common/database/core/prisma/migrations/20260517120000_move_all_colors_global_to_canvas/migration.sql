ALTER TABLE "canvas"
ADD COLUMN "all_colors_global" boolean NOT NULL DEFAULT false;

ALTER TABLE "info"
DROP COLUMN "all_colors_global";
