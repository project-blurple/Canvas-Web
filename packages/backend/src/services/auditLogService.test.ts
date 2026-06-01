import type { Request } from "express";
import { prisma } from "@/client";
import { seedUsers } from "@/test";
import { audit, getAuditLog } from "./auditLogService";

interface ActorOverrides {
  id?: string;
  role?: "admin" | "moderator";
}

function makeRequest(overrides: ActorOverrides = {}): Request {
  return {
    user: { id: overrides.id ?? "1" },
  } as unknown as Request;
}

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
  await prisma.audit_log.create({
    data: {
      actor_id: actorId,
      actor_role: role,
      action,
      resource_type: overrides.resourceType ?? null,
      resource_id:
        overrides.resourceId === undefined ?
          null
        : String(overrides.resourceId),
      metadata: overrides.metadata as never,
      created_at: overrides.createdAt,
    },
  });
}

describe("auditLogService", () => {
  beforeEach(async () => {
    await seedUsers();
  });

  describe("audit()", () => {
    it("writes a row attributed to the requesting user", async () => {
      await audit(makeRequest(), "moderator", "notice.create", {
        resourceId: 42,
        metadata: { hello: "world" },
      });

      const entries = await prisma.audit_log.findMany({});
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        actor_id: 1n,
        actor_role: "moderator",
        action: "notice.create",
        resource_type: "notice",
        resource_id: "42",
        metadata: { hello: "world" },
      });
    });

    it("derives resourceType from the action prefix", async () => {
      await audit(
        makeRequest({ id: "9", role: "admin" }),
        "admin",
        "color.create",
        {
          resourceId: "abc",
        },
      );

      const [entry] = await prisma.audit_log.findMany({});
      expect(entry.resource_type).toBe("color");
    });

    it("is a no-op when the request has no user", async () => {
      const req = { user: undefined } as unknown as Request;
      await audit(req, "moderator", "notice.create");
      const entries = await prisma.audit_log.findMany({});
      expect(entries).toEqual([]);
    });

    it("swallows errors so the caller is never blocked", async () => {
      const badReq = { user: { id: "not-a-number" } } as unknown as Request;
      await expect(
        audit(badReq, "moderator", "notice.create"),
      ).resolves.toBeUndefined();
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
      const page = await getAuditLog({});
      expect(page.entries.map((entry) => entry.action)).toEqual([
        "notice.create",
        "blocklist.remove",
        "blocklist.add",
      ]);
      expect(page.nextCursor).toBeNull();
    });

    it("filters by exact action", async () => {
      const page = await getAuditLog({ action: "blocklist.add" });
      expect(page.entries).toHaveLength(1);
      expect(page.entries[0].action).toBe("blocklist.add");
    });

    it("filters by action prefix when the value ends with a dot", async () => {
      const page = await getAuditLog({ action: "blocklist." });
      expect(page.entries.map((entry) => entry.action).sort()).toEqual([
        "blocklist.add",
        "blocklist.remove",
      ]);
    });

    it("filters by actor id", async () => {
      const page = await getAuditLog({ actorId: "9" });
      expect(page.entries).toHaveLength(1);
      expect(page.entries[0].actorId).toBe("9");
    });

    it("filters by resource type and id", async () => {
      const page = await getAuditLog({
        resourceType: "notice",
        resourceId: "1",
      });
      expect(page.entries).toHaveLength(1);
      expect(page.entries[0].action).toBe("notice.create");
    });

    it("returns an empty page for an unparseable actor id", async () => {
      const page = await getAuditLog({ actorId: "abc" });
      expect(page.entries).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });

    it("paginates with a cursor", async () => {
      const first = await getAuditLog({ limit: 2 });
      expect(first.entries).toHaveLength(2);
      expect(first.nextCursor).not.toBeNull();

      const second = await getAuditLog({
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
      const page = await getAuditLog({ cursor: "not-base64-json" });
      expect(page.entries).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });
  });
});
