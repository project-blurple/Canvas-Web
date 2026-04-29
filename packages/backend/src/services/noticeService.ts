import type { Notice, NoticeType } from "@blurple-canvas-web/types";
import { prisma } from "@/client";

export async function getNotices(activeOnly: boolean): Promise<Notice[]> {
  const notices = await prisma.notice.findMany({
    where: {
      active: activeOnly ? true : undefined,
    },
    orderBy: {
      priority: "desc",
    },
  });

  return notices.map((notice) => ({
    ...notice,
    type: notice.type as NoticeType,
    persistOnDismiss: notice.persist_on_dismiss,
  }));
}
