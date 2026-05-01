import type { Notice, NoticeType } from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import type { CreateNoticeBody } from "@/models/notice.models";

type NoticeDbRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.notice.findFirst>>
>;

function noticeFromDb(notice: NoticeDbRecord): Notice {
  return {
    id: notice.id,
    type: notice.type as NoticeType,
    header: notice.header,
    content: notice.content,
    priority: notice.priority,
    active: notice.active,
    persistOnDismiss: notice.persist_on_dismiss,
    canvasId: notice.canvas_id,
    createdAt: notice.created_at,
  };
}

export async function getNotices(activeOnly: boolean): Promise<Notice[]> {
  const notices = await prisma.notice.findMany({
    where: {
      active: activeOnly ? true : undefined,
    },
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
  active,
  persistOnDismiss,
  canvasId,
}: CreateNoticeBody): Promise<Notice> {
  const notice = await prisma.notice.create({
    data: {
      type,
      header,
      content,
      priority,
      active,
      persist_on_dismiss: persistOnDismiss,
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
  data: { type, header, content, priority, active, persistOnDismiss, canvasId },
}: UpdateNoticeBody): Promise<Notice> {
  const notice = await prisma.notice.update({
    where: {
      id: noticeId,
    },
    data: {
      type,
      header,
      content,
      priority,
      active,
      persist_on_dismiss: persistOnDismiss,
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
