import type { Prisma } from "../../client/generated/client";

export const infoSeedData: Prisma.infoUncheckedCreateInput = {
  title: "Canvas Dev",
  canvas_admin: [708540954302218311n],
  current_event_id: 2034,
  cached_canvas_ids: [2024, 2034],
  admin_server_id: 412754940885467146n,
  /** @privateRemarks This is for the bot, not used by the web app */
  current_emoji_server_id: 412754940885467146n,
  host_server_id: 412754940885467146n,
  default_canvas_id: 2034,
  all_colors_global: false,
};

export const eventSeedData = [
  {
    id: 2024,
    name: "Canvas 2024",
  },
  {
    id: 2034,
    name: "Testing Event",
  },
] as const satisfies readonly Prisma.eventCreateManyInput[];

export const canvasSeedData = [
  {
    id: 2024,
    name: "Canvas 2024",
    locked: true,
    event_id: 2024,
    width: 700,
    height: 700,
    cooldown_length: 30,
    start_coordinates: [1, 1],
  },
  {
    id: 2034,
    name: "Testing Canvas",
    locked: false,
    event_id: 2034,
    width: 100,
    height: 100,
    cooldown_length: 15,
    start_coordinates: [1, 1],
  },
] as const satisfies readonly Prisma.canvasCreateManyInput[];
