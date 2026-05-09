import { prisma } from "@/client";
import { seedColors, seedEvents, seedGuilds } from "@/test";
import {
  assignColorToEvent,
  createColor,
  deleteColor,
  editColor,
  getCurrentEventPalette,
  getEventPalette,
  toPaletteColorSummary,
  unassignColorFromEvent,
} from "./paletteService";

async function seedPaletteInfo(): Promise<void> {
  await prisma.info.upsert({
    where: { title: "Palette Service Test" },
    create: {
      title: "Palette Service Test",
      canvas_admin: [],
      current_event_id: 1,
      cached_canvas_ids: [],
      admin_server_id: BigInt(1),
      current_emoji_server_id: BigInt(1),
      host_server_id: BigInt(1),
      default_canvas_id: 1,
      all_colors_global: false,
    },
    update: {
      current_event_id: 1,
      cached_canvas_ids: [],
      admin_server_id: BigInt(1),
      current_emoji_server_id: BigInt(1),
      host_server_id: BigInt(1),
      default_canvas_id: 1,
      all_colors_global: false,
    },
  });
}

async function resetColorSequence(): Promise<void> {
  await prisma.$executeRawUnsafe(
    "SELECT setval(pg_get_serial_sequence('color', 'id'), (SELECT COALESCE(MAX(id), 0) FROM color) + 1, false);",
  );
}

describe("Palette Lookup Tests", () => {
  beforeEach(async () => {
    await seedEvents();
    await seedColors();
    await seedGuilds();
    await seedPaletteInfo();
  });

  it("Returns only global colors for an event with no assignments", async () => {
    const palette = await getEventPalette(1);
    const ids = palette
      .map((color) => color.id)
      .sort((left, right) => left - right);

    expect(ids).toEqual([1, 2]);
    expect(palette).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          global: true,
        }),
        expect.objectContaining({
          id: 2,
          global: true,
        }),
      ]),
    );
  });

  it("Returns the current event palette", async () => {
    const palette = await getCurrentEventPalette();
    const ids = palette
      .map((color) => color.id)
      .sort((left, right) => left - right);

    expect(ids).toEqual([1, 2]);
  });

  it("Converts a color to a palette summary", async () => {
    expect(
      toPaletteColorSummary({
        id: 1,
        code: "blank",
        name: "Blank tile",
        rgba: [88, 101, 242, 127],
        global: true,
      }),
    ).toEqual({
      id: 1,
      code: "blank",
      name: "Blank tile",
      rgba: [88, 101, 242, 127],
      global: true,
    });
  });

  it("Includes an assigned event color in the palette and removes it again", async () => {
    await assignColorToEvent({
      colorId: 3,
      eventId: 1,
      guildId: BigInt(1),
    });

    const assignedPalette = await getEventPalette(1);
    const assignedIds = assignedPalette
      .map((color) => color.id)
      .sort((left, right) => left - right);

    expect(assignedIds).toEqual([1, 2, 3]);
    expect(assignedPalette.find((color) => color.id === 3)).toMatchObject({
      invite: "Guild 1",
      guildName: "Guild 1",
      guildId: "1",
    });

    await unassignColorFromEvent({
      eventId: 1,
      guildId: BigInt(1),
    });

    const removedPalette = await getEventPalette(1);
    const removedIds = removedPalette
      .map((color) => color.id)
      .sort((left, right) => left - right);

    expect(removedIds).toEqual([1, 2]);
  });
});

describe("Palette Mutation Tests", () => {
  beforeEach(async () => {
    await seedEvents();
    await seedColors();
    await resetColorSequence();
  });

  it("Creates, edits, and deletes a color", async () => {
    const createdColor = await createColor({
      code: "pink",
      name: "Pink",
      rgba: [10, 20, 30, 40],
      global: false,
    });

    expect(createdColor).toMatchObject({
      code: "pink",
      name: "Pink",
      rgba: [10, 20, 30, 40],
      global: false,
    });

    const editedColor = await editColor({
      colorId: createdColor.id,
      data: {
        code: "rose",
        name: "Rose",
        rgba: [40, 30, 20, 10],
        global: true,
      },
    });

    expect(editedColor).toMatchObject({
      id: createdColor.id,
      code: "rose",
      name: "Rose",
      rgba: [40, 30, 20, 10],
      global: true,
    });

    await deleteColor(createdColor.id);
    await expect(
      prisma.color.findFirst({ where: { id: createdColor.id } }),
    ).resolves.toBeNull();
  });
});
