import type { Notice, NoticeType } from "@blurple-canvas-web/types";
import { prisma } from "@/client";

type NoticeDbRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.notice.findFirst>>
>;

function noticeFromDb(notice: NoticeDbRecord): Notice {
  return {
    ...notice,
    type: notice.type as NoticeType,
    persistOnDismiss: notice.persist_on_dismiss,
  };
}

export async function getNotices(activeOnly: boolean): Promise<Notice[]> {
  const notices = await prisma.notice.findMany({
    where: {
      active: activeOnly ? true : undefined,
    },
    orderBy: {
      priority: "desc",
    },
  });

  return notices.map(noticeFromDb);
}

interface CreateNoticeParams {
  type: NoticeType;
  header?: string;
  content?: string;
  priority?: number;
  active?: boolean;
  persistOnDismiss?: boolean;
  canvasId?: number;
}

export async function createNotice({
  type,
  header,
  content,
  priority,
  active,
  persistOnDismiss,
  canvasId,
}: CreateNoticeParams): Promise<Notice> {
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

interface ModifyNoticeParams {
  noticeId: number;
  type?: NoticeType;
  header?: string | null;
  content?: string | null;
  priority?: number;
  active?: boolean;
  persistOnDismiss?: boolean;
  canvasId?: number | null;
}

export async function updateNotice({
  noticeId,
  type,
  header,
  content,
  priority,
  active,
  persistOnDismiss,
  canvasId,
}: ModifyNoticeParams): Promise<Notice> {
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
