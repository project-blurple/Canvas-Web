import type { Notice, NoticeType } from "@blurple-canvas-web/types";
import { type notice as NoticeDbModel, prisma } from "@/client";
import { BadRequestError } from "@/errors";
import type { CreateNoticeBody } from "@/models/notice.models";

function noticeFromDb(notice: NoticeDbModel): Notice {
  return {
    id: notice.id,
    type: notice.type as NoticeType,
    header: notice.header,
    content: notice.content,
    priority: notice.priority,
    startAt: notice.start_at,
    endAt: notice.end_at,
    persisted: notice.persisted,
    canvasId: notice.canvas_id,
    createdAt: notice.created_at,
  };
}

function normalizeNoticeWindow({
  startAt,
  endAt,
}: {
  startAt?: Date | null;
  endAt?: Date | null;
}): { startAt?: Date | null; endAt?: Date | null } {
  const normalizedStartAt =
    endAt !== undefined && endAt !== null && startAt === undefined ?
      new Date()
    : startAt;

  if (
    normalizedStartAt !== undefined &&
    normalizedStartAt !== null &&
    endAt !== undefined &&
    endAt !== null &&
    endAt <= normalizedStartAt
  ) {
    throw new BadRequestError("endAt must be after startAt");
  }

  return {
    startAt: normalizedStartAt,
    endAt,
  };
}

export async function getNotices(activeOnly: boolean): Promise<Notice[]> {
  const now = new Date();

  const notices = await prisma.notice.findMany({
    where:
      activeOnly ?
        {
          start_at: {
            not: null,
            lte: now,
          },
          OR: [{ end_at: null }, { end_at: { gt: now } }],
        }
      : undefined,
    orderBy: {
      priority: "asc",
    },
  });

  return notices.map(noticeFromDb);
}

export async function createNotice({
  type,
  header,
  content,
  priority,
  startAt,
  endAt,
  persisted,
  canvasId,
}: CreateNoticeBody): Promise<Notice> {
  const normalizedWindow = normalizeNoticeWindow({ startAt, endAt });

  const notice = await prisma.notice.create({
    data: {
      type,
      header,
      content,
      priority,
      start_at: normalizedWindow.startAt,
      end_at: normalizedWindow.endAt,
      persisted: persisted,
      canvas_id: canvasId,
    },
  });

  return noticeFromDb(notice);
}

interface UpdateNoticeBody {
  noticeId: number;
  data: CreateNoticeBody;
}

export async function updateNotice({
  noticeId,
  data: {
    type,
    header,
    content,
    priority,
    startAt,
    endAt,
    persisted,
    canvasId,
  },
}: UpdateNoticeBody): Promise<Notice> {
  const normalizedWindow = normalizeNoticeWindow({ startAt, endAt });

  const notice = await prisma.notice.update({
    where: {
      id: noticeId,
    },
    data: {
      type,
      header,
      content,
      priority,
      start_at: normalizedWindow.startAt,
      end_at: normalizedWindow.endAt,
      persisted: persisted,
      canvas_id: canvasId,
    },
  });

  return noticeFromDb(notice);
}

export async function deleteNotice(noticeId: number): Promise<void> {
  await prisma.notice.delete({
    where: {
      id: noticeId,
    },
  });
}
