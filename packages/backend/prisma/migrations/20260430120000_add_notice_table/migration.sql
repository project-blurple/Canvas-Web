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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_pkey" PRIMARY KEY ("id")
);
