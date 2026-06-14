import { Test, type TestingModule } from "@nestjs/testing";

import { PixelReconciliationService } from "@/canvas/pixel-reconciliation.service";
import { DatabaseModule } from "@/common/database/database.module";
import { AppConfigModule } from "@/config/config.module";
import { testPrisma as prisma } from "@/test/database";
import { seedBlacklist } from "@/test/seed/blacklist";
import { seedUsers } from "@/test/seed/users";
import { BlocklistService } from "./blocklist.service";

const pixelReconciliationService = {
  restoreErasedHistory: vi.fn(),
};

describe("BlocklistService", () => {
  let moduleRef: TestingModule;
  let service: BlocklistService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [
        BlocklistService,
        {
          provide: PixelReconciliationService,
          useValue: pixelReconciliationService,
        },
      ],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(BlocklistService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await seedUsers();
    await seedBlacklist();
  });

  describe("getBlocklist", () => {
    it("returns the blocklist entries, newest first", async () => {
      await expect(service.getBlocklist()).resolves.toStrictEqual([
        {
          userId: "9",
          dateAdded: new Date(0).toISOString(),
          username: null,
          profilePictureUrl: null,
        },
      ]);
    });
  });

  describe("userIsBlocklisted", () => {
    it("returns true for a blocked user", async () => {
      await expect(service.userIsBlocklisted(9n)).resolves.toBe(true);
    });

    it("returns false for an unblocked user", async () => {
      await expect(service.userIsBlocklisted(1n)).resolves.toBe(false);
    });
  });

  describe("addUsersToBlocklist", () => {
    it("adds users from any iterable, skipping duplicates", async () => {
      await expect(
        service.addUsersToBlocklist(new Set([1n])),
      ).resolves.toStrictEqual([{ userId: 1n, dateAdded: expect.any(Date) }]);

      await expect(service.userIsBlocklisted(1n)).resolves.toBe(true);
    });
  });

  describe("removeUsersFromBlocklist", () => {
    it("removes users from the blocklist", async () => {
      await prisma.blacklist.create({ data: { userId: 1n } });

      await service.removeUsersFromBlocklist(new Set([1n]));

      await expect(service.userIsBlocklisted(1n)).resolves.toBe(false);
      expect(
        pixelReconciliationService.restoreErasedHistory,
      ).not.toHaveBeenCalled();
    });

    it("restores pixel history before removing when requested", async () => {
      await service.removeUsersFromBlocklist(new Set([1n]), [1]);

      expect(
        pixelReconciliationService.restoreErasedHistory,
      ).toHaveBeenCalledWith([1n], [1]);
    });
  });
});
