import type { BlurpleEvent } from "@blurple-canvas-web/types";
import { Test, type TestingModule } from "@nestjs/testing";
import { DatabaseModule } from "@/common/database/database.module";
import { ConflictError } from "@/common/errors/conflict.error";
import { AppConfigModule } from "@/config/config.module";
import { EventService } from "@/event/event.service";
import { testPrisma as prisma, resetSequence } from "@/test/database";
import { seedColors } from "@/test/seed/colors";
import { seedEvents } from "@/test/seed/events";
import { seedGuilds } from "@/test/seed/guilds";
import { PaletteService } from "./palette.service";

const eventService = {
  getCurrentEvent: vi.fn(
    async (): Promise<BlurpleEvent> => ({
      id: 1,
      name: "Current Event",
      isCurrentEvent: true,
    }),
  ),
};

describe("PaletteService", () => {
  let moduleRef: TestingModule;
  let service: PaletteService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [
        PaletteService,
        { provide: EventService, useValue: eventService },
      ],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(PaletteService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await seedEvents();
    await seedGuilds();
    await seedColors();
    // The seed inserts explicit colour ids without advancing the sequence.
    await resetSequence("color");
    // Assign a partner colour (id 3) to event 1, guild 1.
    await prisma.participation.create({
      data: { colorId: 3, eventId: 1, guildId: 1n },
    });
  });

  describe("getEventPalette", () => {
    it("returns global colours plus the event's partner colours", async () => {
      const palette = await service.getEventPalette(1);
      const ids = palette.map((color) => color.id).sort();
      // Globals 1 & 2, plus partner colour 3 for event 1.
      expect(ids).toEqual([1, 2, 3]);

      const partner = palette.find((color) => color.id === 3);
      expect(partner).toMatchObject({
        invite: "Guild 1",
        guildName: "Guild 1",
        guildId: "1",
      });
    });

    it("returns every colour when allColors is set", async () => {
      const palette = await service.getEventPalette(1, true);
      expect(palette.map((color) => color.id).sort()).toEqual([1, 2, 3, 4]);
    });

    it("excludes partner colours from other events", async () => {
      const palette = await service.getEventPalette(9);
      expect(palette.map((color) => color.id).sort()).toEqual([1, 2]);
    });
  });

  describe("getCurrentEventPalette", () => {
    it("resolves the current event and returns its palette", async () => {
      const palette = await service.getCurrentEventPalette();
      expect(eventService.getCurrentEvent).toHaveBeenCalled();
      expect(palette.map((color) => color.id).sort()).toEqual([1, 2, 3]);
    });
  });

  describe("createColor", () => {
    it("creates a colour", async () => {
      const color = await service.createColor({
        code: "grn",
        name: "Green",
        rgba: [0, 255, 0, 255],
        global: true,
      });
      expect(color.id).toBeGreaterThan(0);
      await expect(
        prisma.color.findUnique({ where: { id: color.id } }),
      ).resolves.toMatchObject({ name: "Green" });
    });
  });

  describe("editColor", () => {
    it("updates a colour", async () => {
      await service.editColor({
        colorId: 3,
        data: {
          code: "red2",
          name: "Redder",
          rgba: [255, 0, 0, 255],
          global: false,
        },
      });
      await expect(
        prisma.color.findUnique({ where: { id: 3 } }),
      ).resolves.toMatchObject({ name: "Redder" });
    });
  });

  describe("deleteColor", () => {
    it("deletes a colour", async () => {
      await prisma.participation.deleteMany({ where: { colorId: 3 } });
      await service.deleteColor(3);
      await expect(
        prisma.color.findUnique({ where: { id: 3 } }),
      ).resolves.toBeNull();
    });
  });

  describe("assignColorToEvent", () => {
    it("creates a participation", async () => {
      await service.assignColorToEvent({
        colorId: 4,
        eventId: 9,
        guildId: 9n,
      });
      await expect(
        prisma.participation.findFirst({
          where: { colorId: 4, eventId: 9, guildId: 9n },
        }),
      ).resolves.not.toBeNull();
    });

    it("throws ConflictError when the colour is already assigned", async () => {
      await expect(
        service.assignColorToEvent({ colorId: 3, eventId: 1, guildId: 1n }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("unassignColorFromEvent", () => {
    it("removes a participation", async () => {
      await service.unassignColorFromEvent({ eventId: 1, guildId: 1n });
      await expect(
        prisma.participation.findFirst({ where: { eventId: 1, guildId: 1n } }),
      ).resolves.toBeNull();
    });
  });
});
