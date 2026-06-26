import { Test, type TestingModule } from "@nestjs/testing";
import { DatabaseModule } from "@/common/database/database.module";
import { ConflictError } from "@/common/errors/conflict.error";
import { NotFoundError } from "@/common/errors/not-found.error";
import { AppConfigModule } from "@/config/config.module";
import { testPrisma as prisma } from "@/test/database";
import { seedEvents } from "@/test/seed/events";
import { EventService } from "./event.service";

async function seedInfo(currentEventId = 1) {
  await prisma.info.create({
    data: {
      title: "Event Test",
      canvasAdmin: [],
      currentEventId,
      cachedCanvasIds: [],
      adminServerId: 1n,
      currentEmojiServerId: 1n,
      hostServerId: 1n,
      defaultCanvasId: 1,
    },
  });
}

describe("EventService", () => {
  let moduleRef: TestingModule;
  let service: EventService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [EventService],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(EventService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await seedEvents();
    await seedInfo();
  });

  describe("getCurrentEvent", () => {
    it("returns the current event flagged as current", async () => {
      await expect(service.getCurrentEvent()).resolves.toStrictEqual({
        id: 1,
        name: "Current Event",
        isCurrentEvent: true,
      });
    });
  });

  describe("getEventById", () => {
    it("returns an event, flagging whether it is current", async () => {
      await expect(service.getEventById(9)).resolves.toStrictEqual({
        id: 9,
        name: "Past Event",
        isCurrentEvent: false,
      });
    });

    it("throws NotFoundError for an unknown event", async () => {
      await expect(service.getEventById(404)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("createEvent", () => {
    it("creates a new event", async () => {
      await expect(service.createEvent("New Event", 5)).resolves.toStrictEqual({
        id: 5,
        name: "New Event",
        isCurrentEvent: false,
      });

      await expect(
        prisma.event.findUnique({ where: { id: 5 } }),
      ).resolves.toMatchObject({ id: 5, name: "New Event" });
    });

    it("throws ConflictError when the ID already exists", async () => {
      await expect(service.createEvent("Dupe", 1)).rejects.toBeInstanceOf(
        ConflictError,
      );
    });
  });

  describe("editEvent", () => {
    it("renames an event", async () => {
      await expect(service.editEvent(9, "Renamed")).resolves.toStrictEqual({
        id: 9,
        name: "Renamed",
        isCurrentEvent: false,
      });
    });
  });
});
