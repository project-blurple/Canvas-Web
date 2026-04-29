import { prisma } from "@/client";
import { NotFoundError } from "@/errors";
import { seedEvents } from "@/test";
import {
  createEvent,
  editEvent,
  getCurrentEvent,
  getEventById,
} from "./eventService";

async function seedCurrentEventInfo(): Promise<void> {
  await prisma.info.upsert({
    where: { title: "Event Service Test" },
    create: {
      title: "Event Service Test",
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

describe("Event Service Tests", () => {
  beforeEach(async () => {
    await seedEvents();
    await seedCurrentEventInfo();
  });

  it("Gets an event by ID", async () => {
    expect(await getEventById(1)).toMatchObject({
      id: 1,
      name: "Current Event",
    });
  });

  it("Rejects a missing event by ID", async () => {
    return expect(getEventById(9999)).rejects.toThrow(NotFoundError);
  });

  it("Gets the current event from info", async () => {
    expect(await getCurrentEvent()).toMatchObject({
      id: 1,
      name: "Current Event",
    });
  });
});

describe("Event Mutation Tests", () => {
  beforeEach(async () => {
    await seedEvents();
  });

  it("Creates a new event", async () => {
    const event = await createEvent("New Event", 77);

    expect(event).toMatchObject({
      id: 77,
      name: "New Event",
    });
    expect(await getEventById(77)).toMatchObject({
      id: 77,
      name: "New Event",
    });
  });

  it("Rejects creating a duplicate event", async () => {
    return expect(createEvent("Duplicate Event", 1)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("Edits an existing event", async () => {
    const event = await editEvent(1, "Updated Event");

    expect(event).toMatchObject({
      id: 1,
      name: "Updated Event",
    });
  });
});
