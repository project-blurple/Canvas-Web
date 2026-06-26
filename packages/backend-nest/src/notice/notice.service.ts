import type { Notice, NoticeBody, NoticeType } from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";

import type { Notice as NoticeDbModel } from "@/common/database/prisma.client";
import { PrismaService } from "@/common/database/prisma.service";

@Injectable()
export class NoticeService {
  constructor(private readonly prisma: PrismaService) {}

  private noticeFromDb(notice: NoticeDbModel): Notice {
    return {
      id: notice.id,
      type: notice.type as NoticeType,
      header: notice.header,
      content: notice.content,
      priority: notice.priority,
      startAt: notice.startAt?.toISOString() ?? null,
      endAt: notice.endAt?.toISOString() ?? null,
      persisted: notice.persisted,
      canvasId: notice.canvasId,
      createdAt: notice.createdAt.toISOString(),
    };
  }

  private isNoticeActive(notice: Notice): boolean {
    // A notice without startAt has not been scheduled and is never active.
    // The input invariant ensures endAt can only be set when startAt is too.
    if (!notice.startAt) return false;

    const now = new Date();
    const hasStarted = now >= new Date(notice.startAt);
    const hasEnded = notice.endAt ? now >= new Date(notice.endAt) : false;
    return hasStarted && !hasEnded;
  }

  async getNotices(activeOnly: boolean): Promise<Notice[]> {
    const now = new Date();

    const notices = await this.prisma.notice.findMany({
      where:
        activeOnly ?
          {
            startAt: {
              not: null,
              lte: now,
            },
            OR: [{ endAt: null }, { endAt: { gt: now } }],
          }
        : undefined,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    const mappedNotices = notices.map((notice) => this.noticeFromDb(notice));
    if (!activeOnly) {
      mappedNotices.sort((a, b) => {
        // Active notices sort above inactive ones, regardless of priority.
        const aIsActive = this.isNoticeActive(a);
        const bIsActive = this.isNoticeActive(b);

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

  async createNotice({
    type,
    header,
    content,
    priority,
    startAt,
    endAt,
    persisted,
    canvasId,
  }: NoticeBody): Promise<Notice> {
    const notice = await this.prisma.notice.create({
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
    });

    return this.noticeFromDb(notice);
  }

  async updateNotice({
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
  }: {
    noticeId: number;
    data: NoticeBody;
  }): Promise<Notice> {
    const notice = await this.prisma.notice.update({
      where: {
        id: noticeId,
      },
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
    });

    return this.noticeFromDb(notice);
  }

  async deleteNotice(noticeId: number): Promise<void> {
    await this.prisma.notice.delete({
      where: {
        id: noticeId,
      },
    });
  }
}
