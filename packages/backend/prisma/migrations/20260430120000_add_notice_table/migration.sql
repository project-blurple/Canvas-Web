-- CreateTable
CREATE TABLE "notice" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "header" TEXT,
    "content" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "start_at" TIMESTAMPTZ(6),
    "end_at" TIMESTAMPTZ(6),
    "persist_on_dismiss" BOOLEAN NOT NULL DEFAULT false,
    "canvas_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notice_end_requires_start_chk" CHECK ("end_at" IS NULL OR "start_at" IS NOT NULL),
    CONSTRAINT "notice_end_after_start_chk" CHECK ("end_at" IS NULL OR "end_at" > "start_at")
);
