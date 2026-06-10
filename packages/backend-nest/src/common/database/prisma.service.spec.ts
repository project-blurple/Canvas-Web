import { Test, TestingModule } from "@nestjs/testing";

import { DatabaseModule } from "@/common/database/database.module";
import { PrismaService } from "@/common/database/prisma.service";
import { AppConfigModule } from "@/config/config.module";

// No provider override: the test harness (src/test/database.ts) transparently
// backs every PrismaService with the per-test transaction.
describe("PrismaService", () => {
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
    }).compile();
    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it("round-trips camelCase writes and reads through Prisma and $kysely", async () => {
    await prisma.event.create({ data: { id: 9001, name: "Test Event" } });
    await prisma.canvas.create({
      data: {
        id: 9001,
        name: "Test Canvas",
        eventId: 9001,
        width: 2,
        height: 2,
        cooldownLength: 10,
      },
    });
    await prisma.user.create({ data: { id: 9001n } });
    await prisma.color.create({
      data: { id: 9001, code: "test", name: "Test", rgba: [1, 2, 3, 255] },
    });

    // snake_case columns with digits (x_0 ...) round-trip as x0 etc.
    await prisma.frame.create({
      data: {
        id: "TEST01",
        canvasId: 9001,
        ownerUserId: 9001n,
        name: "Test Frame",
        x0: 0,
        x1: 1,
        y0: 0,
        y1: 1,
      },
    });
    const frame = await prisma.$kysely
      .selectFrom("frame")
      .select(["id", "canvasId", "ownerUserId", "x0", "x1", "y0", "y1"])
      .where("id", "=", "TEST01")
      .executeTakeFirstOrThrow();
    expect(frame).toEqual({
      id: "TEST01",
      canvasId: 9001,
      ownerUserId: 9001n,
      x0: 0,
      x1: 1,
      y0: 0,
      y1: 1,
    });

    // Write through $kysely, read back through the Prisma model API.
    await prisma.$kysely
      .insertInto("pixel")
      .values({ canvasId: 9001, x: 1, y: 1, colorId: 9001 })
      .execute();
    const pixel = await prisma.pixel.findUniqueOrThrow({
      where: { canvasId_x_y: { canvasId: 9001, x: 1, y: 1 } },
    });
    expect(pixel.colorId).toBe(9001);
  });

  it("is isolated per test: the previous test's writes were rolled back", async () => {
    expect(await prisma.event.count({ where: { id: 9001 } })).toBe(0);
  });

  it("reads the statistics views through the camelCase client API", async () => {
    // The views exist (created by the migrations) and are empty on a fresh DB.
    expect(await prisma.canvasStats.findMany()).toEqual([]);
    expect(
      await prisma.$kysely.selectFrom("leaderboard").selectAll().execute(),
    ).toEqual([]);
  });
});
