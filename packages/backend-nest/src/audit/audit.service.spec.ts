import { Test, type TestingModule } from "@nestjs/testing";

import { DatabaseModule } from "@/common/database/database.module";
import { AppConfigModule } from "@/config/config.module";
import { testPrisma as prisma } from "@/test/database";
import { seedUsers } from "@/test/seed/users";
import { AuditService } from "./audit.service";

async function insert(
  actorId: bigint,
  role: "admin" | "moderator",
  action: string,
  overrides: Partial<{
    resourceType: string;
    resourceId: string | number;
    metadata: unknown;
    createdAt: Date;
  }> = {},
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole: role,
      action,
      resourceType: overrides.resourceType ?? null,
      resourceId:
        overrides.resourceId === undefined ?
          null
        : String(overrides.resourceId),
      metadata: overrides.metadata as never,
      createdAt: overrides.createdAt,
    },
  });
}

describe("AuditService", () => {
  let moduleRef: TestingModule;
  let service: AuditService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [AuditService],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(AuditService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await seedUsers();
  });

  describe("handleAuditEvent", () => {
    it("writes a row from the emitted payload", async () => {
      await service.handleAuditEvent({
        actorId: "1",
        actorRole: "moderator",
        action: "notice.create",
        resourceId: "42",
        metadata: { hello: "world" },
      });

      const entries = await prisma.auditLog.findMany({});
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        actorId: 1n,
        actorRole: "moderator",
        action: "notice.create",
        resourceType: "notice",
        resourceId: "42",
        metadata: { hello: "world" },
      });
    });

    it("derives resourceType from the action prefix", async () => {
      await service.handleAuditEvent({
        actorId: "9",
        actorRole: "admin",
        action: "color.create",
        resourceId: "abc",
      });

      const [entry] = await prisma.auditLog.findMany({});
      expect(entry.resourceType).toBe("color");
    });

    it("swallows errors so the listener never throws", async () => {
      await expect(
        service.handleAuditEvent({
          actorId: "not-a-number",
          actorRole: "moderator",
          action: "notice.create",
          resourceId: null,
        }),
      ).resolves.toBeUndefined();
      const entries = await prisma.auditLog.findMany({});
      expect(entries).toEqual([]);
    });
  });

  describe("getAuditLog", () => {
    beforeEach(async () => {
      await insert(1n, "moderator", "blocklist.add", {
        resourceType: "blocklist",
        createdAt: new Date("2026-05-22T10:00:00Z"),
      });
      await insert(1n, "moderator", "blocklist.remove", {
        resourceType: "blocklist",
        createdAt: new Date("2026-05-22T10:01:00Z"),
      });
      await insert(9n, "admin", "notice.create", {
        resourceType: "notice",
        resourceId: 1,
        createdAt: new Date("2026-05-22T10:02:00Z"),
      });
    });

    it("returns entries newest-first", async () => {
      const page = await service.getAuditLog({});
      expect(page.entries.map((entry) => entry.action)).toEqual([
        "notice.create",
        "blocklist.remove",
        "blocklist.add",
      ]);
      expect(page.nextCursor).toBeNull();
    });

    it("filters by exact action", async () => {
      const page = await service.getAuditLog({ action: "blocklist.add" });
      expect(page.entries).toHaveLength(1);
      expect(page.entries[0].action).toBe("blocklist.add");
    });

    it("filters by action prefix when the value ends with a dot", async () => {
      const page = await service.getAuditLog({ action: "blocklist." });
      expect(page.entries.map((entry) => entry.action).sort()).toEqual([
        "blocklist.add",
        "blocklist.remove",
      ]);
    });

    it("filters by actor id", async () => {
      const page = await service.getAuditLog({ actorId: "9" });
      expect(page.entries).toHaveLength(1);
      expect(page.entries[0].actorId).toBe("9");
    });

    it("filters by resource type and id", async () => {
      const page = await service.getAuditLog({
        resourceType: "notice",
        resourceId: "1",
      });
      expect(page.entries).toHaveLength(1);
      expect(page.entries[0].action).toBe("notice.create");
    });

    it("joins the actor's Discord profile when present", async () => {
      await prisma.discordUserProfile.create({
        data: {
          userId: 9n,
          username: "admin_user",
          profilePictureUrl: "https://example.com/admin.png",
        },
      });

      const page = await service.getAuditLog({ actorId: "9" });
      expect(page.entries[0].actorUsername).toBe("admin_user");
      expect(page.entries[0].actorProfilePictureUrl).toBe(
        "https://example.com/admin.png",
      );
    });

    it("returns an empty page for an unparseable actor id", async () => {
      const page = await service.getAuditLog({ actorId: "abc" });
      expect(page.entries).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });

    it("paginates with a cursor", async () => {
      const first = await service.getAuditLog({ limit: 2 });
      expect(first.entries).toHaveLength(2);
      expect(first.nextCursor).not.toBeNull();

      const second = await service.getAuditLog({
        limit: 2,
        cursor: first.nextCursor ?? undefined,
      });
      expect(second.entries).toHaveLength(1);
      expect(second.nextCursor).toBeNull();

      const all = [...first.entries, ...second.entries].map(
        (entry) => entry.action,
      );
      expect(all).toEqual([
        "notice.create",
        "blocklist.remove",
        "blocklist.add",
      ]);
    });

    it("returns an empty page for an invalid cursor", async () => {
      const page = await service.getAuditLog({ cursor: "not-base64-json" });
      expect(page.entries).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });

    it("paginates entries that share an identical timestamp without skipping", async () => {
      // Two entries in the same instant plus an older one; the id tie-break
      // must keep them all visible across single-row pages. Within the shared
      // instant the later-inserted (larger id) row sorts first.
      const sharedInstant = new Date("2026-06-01T12:00:00.000Z");
      await prisma.auditLog.deleteMany({});
      await insert(1n, "admin", "notice.create", { createdAt: sharedInstant });
      await insert(1n, "admin", "notice.update", { createdAt: sharedInstant });
      await insert(1n, "admin", "notice.delete", {
        createdAt: new Date("2026-06-01T11:59:00.000Z"),
      });

      const seen: string[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 3; i++) {
        const page = await service.getAuditLog({ limit: 1, cursor });
        expect(page.entries).toHaveLength(1);
        seen.push(page.entries[0].action);
        if (!page.nextCursor) break;
        cursor = page.nextCursor;
      }

      // Newest-first (id DESC tie-break), and every entry appears exactly once.
      expect(seen).toEqual(["notice.update", "notice.create", "notice.delete"]);
    });
  });
});
