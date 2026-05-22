import type { Notice, NoticeType } from "@blurple-canvas-web/types";
import { type notice as NoticeDbModel, prisma } from "@/client";
import { BadRequestError } from "@/errors";
import type {
  CreateNoticeBody,
  ModifyNoticeBody,
} from "@/models/notice.models";

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

function isNoticeActive(notice: Notice): boolean {
  const now = new Date();
  const hasStarted = notice.startAt ? now >= new Date(notice.startAt) : null;
  const hasEnded = notice.endAt ? now >= new Date(notice.endAt) : null;
  return (
    (hasStarted === true && hasEnded === false) ||
    (hasStarted === true && hasEnded === null) ||
    (hasStarted === null && hasEnded === false) // this case should theoretically never exist
  );
}

function normalizeNoticeWindow({
  startAt,
  endAt,
}: {
  startAt?: Date | null;
  endAt?: Date | null;
}): { startAt?: Date | null; endAt?: Date | null } {
  const normalizedStartAt =
    (
      endAt !== undefined &&
      endAt !== null &&
      (startAt === undefined || startAt === null)
    ) ?
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

interface UpdateNoticeInput {
  noticeId: number;
  data: ModifyNoticeBody;
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
  const existingTimestamps = await getNoticeTimestamps(noticeId);

  const updatedStartAt =
    startAt !== undefined ? startAt : existingTimestamps.startAt;
  const updatedEndAt = endAt !== undefined ? endAt : existingTimestamps.endAt;

  const normalizedWindow = normalizeNoticeWindow({
    startAt: updatedStartAt,
    endAt: updatedEndAt,
  });

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

async function getNoticeTimestamps(noticeId: number): Promise<{
  startAt?: Date | null;
  endAt?: Date | null;
}> {
  const notice = await prisma.notice.findUnique({
    where: {
      id: noticeId,
    },
    select: {
      start_at: true,
      end_at: true,
    },
  });

  if (!notice) {
    throw new BadRequestError("Notice not found");
  }

  return {
    startAt: notice.start_at,
    endAt: notice.end_at,
  };
}
