import type { Notice, NoticeBody, NoticeType } from "@blurple-canvas-web/types";
import { type notice as NoticeDbModel, prisma } from "@/client";
import { BadRequestError } from "@/errors";

function noticeFromDb(notice: NoticeDbModel): Notice {
  return {
    id: notice.id,
    type: notice.type as NoticeType,
    header: notice.header,
    content: notice.content,
    priority: notice.priority,
    startAt: notice.start_at?.toISOString() ?? null,
    endAt: notice.end_at?.toISOString() ?? null,
    persisted: notice.persisted,
    canvasId: notice.canvas_id,
    createdAt: notice.created_at.toISOString(),
  };
}

function isNoticeActive(notice: Notice): boolean {
  // A notice without startAt has not been scheduled and is never active.
  // The input invariant ensures endAt can only be set when startAt is also set.
  if (!notice.startAt) return false;

  const now = new Date();
  const hasStarted = now >= new Date(notice.startAt);
  const hasEnded = notice.endAt ? now >= new Date(notice.endAt) : false;
  return hasStarted && !hasEnded;
}

function normalizeNoticeWindow({
  startAt,
  endAt,
}: {
  startAt?: Date | null;
  endAt?: Date | null;
}): { startAt?: Date | null; endAt?: Date | null } {
  if (startAt != null && endAt != null && endAt <= startAt) {
    throw new BadRequestError("endAt must be after startAt");
  }

  return { startAt, endAt };
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
    orderBy: [{ priority: "asc" }, { created_at: "desc" }],
  });

  const mappedNotices = notices.map(noticeFromDb);
  if (!activeOnly) {
    mappedNotices.sort((a, b) => {
      // Active notices should be sorted above inactive ones, regardless of priority
      const aIsActive = isNoticeActive(a);
      const bIsActive = isNoticeActive(b);

      if (aIsActive && !bIsActive) {
        return -1;
      } else if (!aIsActive && bIsActive) {
        return 1;
      } else {
        return 0;
      }
    });
  }
  return mappedNotices;
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
}: NoticeBody): Promise<Notice> {
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

interface UpdateNoticeInput {
  noticeId: number;
  data: NoticeBody;
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
}: UpdateNoticeInput): Promise<Notice> {
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
