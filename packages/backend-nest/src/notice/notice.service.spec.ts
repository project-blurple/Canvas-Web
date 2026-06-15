import { NoticeBodyModel } from "@blurple-canvas-web/types";
import { Test, type TestingModule } from "@nestjs/testing";
import { DatabaseModule } from "@/common/database/database.module";
import { AppConfigModule } from "@/config/config.module";
import { testPrisma as prisma } from "@/test/database";
import { NoticeService } from "./notice.service";

const HOUR = 60 * 60 * 1000;

describe("NoticeService", () => {
  let moduleRef: TestingModule;
  let service: NoticeService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [NoticeService],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(NoticeService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe("getNotices", () => {
    beforeEach(async () => {
      const now = Date.now();
      await prisma.notice.createMany({
        data: [
          // Active, low priority
          {
            id: 1,
            type: "info",
            header: "Active high",
            priority: 0,
            startAt: new Date(now - HOUR),
          },
          // Active, high priority
          {
            id: 2,
            type: "warning",
            header: "Active low",
            priority: 5,
            startAt: new Date(now - HOUR),
          },
          // Draft (no startAt) — never active
          { id: 3, type: "info", header: "Draft", priority: 0 },
          // Expired
          {
            id: 4,
            type: "error",
            header: "Expired",
            priority: 0,
            startAt: new Date(now - 2 * HOUR),
            endAt: new Date(now - HOUR),
          },
        ],
      });
    });

    it("returns only active notices, ordered by priority", async () => {
      const notices = await service.getNotices(true);
      expect(notices.map((notice) => notice.id)).toEqual([1, 2]);
    });

    it("returns everything for admin, sorting active first", async () => {
      const notices = await service.getNotices(false);
      const activeIds = notices
        .slice(0, 2)
        .map((notice) => notice.id)
        .sort((a, b) => a - b);
      expect(activeIds).toEqual([1, 2]);
      expect(notices).toHaveLength(4);
    });
  });

  describe("createNotice", () => {
    it("creates a notice and serialises the window", async () => {
      const startAt = new Date(Date.now() - HOUR);
      const notice = await service.createNotice({
        type: "info",
        header: "Hello",
        content: "World",
        priority: 1,
        startAt,
        persisted: true,
      });

      expect(notice).toMatchObject({
        type: "info",
        header: "Hello",
        content: "World",
        priority: 1,
        persisted: true,
        startAt: startAt.toISOString(),
        endAt: null,
      });
    });
  });

  describe("updateNotice", () => {
    it("updates an existing notice", async () => {
      await prisma.notice.create({
        data: { id: 10, type: "info", header: "Before", priority: 0 },
      });

      const updated = await service.updateNotice({
        noticeId: 10,
        data: { type: "warning", header: "After", priority: 2 },
      });

      expect(updated).toMatchObject({
        id: 10,
        type: "warning",
        header: "After",
        priority: 2,
      });
    });
  });

  describe("deleteNotice", () => {
    it("deletes a notice", async () => {
      await prisma.notice.create({
        data: { id: 20, type: "info", priority: 0 },
      });

      await service.deleteNotice(20);

      await expect(
        prisma.notice.findUnique({ where: { id: 20 } }),
      ).resolves.toBeNull();
    });
  });

  // The notice window invariants and field normalization are enforced by the
  // schema (via the global validation pipe) rather than the service.
  describe("NoticeBodyModel", () => {
    it("rejects an end-before-start window", () => {
      const startAt = new Date();
      const result = NoticeBodyModel.safeParse({
        type: "info",
        startAt,
        endAt: new Date(startAt.getTime() - HOUR),
      });
      expect(result.success).toBe(false);
    });

    it("rejects endAt without startAt", () => {
      const result = NoticeBodyModel.safeParse({
        type: "info",
        endAt: new Date(),
      });
      expect(result.success).toBe(false);
    });

    it("rejects an unknown notice type", () => {
      const result = NoticeBodyModel.safeParse({ type: "banana" });
      expect(result.success).toBe(false);
    });

    it("trims header and content", () => {
      const result = NoticeBodyModel.parse({
        type: "info",
        header: "  spaced  ",
        content: "  text  ",
      });
      expect(result).toMatchObject({ header: "spaced", content: "text" });
    });
  });
});
