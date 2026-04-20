interface InfoSeedData {
  title: string;
  canvas_admin: bigint[];
  current_event_id: number;
  cached_canvas_ids: number[];
  admin_server_id: bigint;
  current_emoji_server_id: bigint;
  host_server_id: bigint;
  default_canvas_id: number;
  all_colors_global: boolean;
}

export const infoSeedData: InfoSeedData = {
  title: "Canvas Dev",
  canvas_admin: [708540954302218311n],
  current_event_id: 2034,
  cached_canvas_ids: [2024, 2034],
  admin_server_id: 412754940885467146n,
  current_emoji_server_id: 412754940885467146n, // This is for the bot, not used by the web app
  host_server_id: 412754940885467146n,
  default_canvas_id: 2034,
  all_colors_global: false,
};

interface EventSeedData {
  id: number;
  name: string;
}

export const eventSeedData = [
  {
    id: 2024,
    name: "Canvas 2024",
  },
  {
    id: 2034,
    name: "Testing Event",
  },
] as const satisfies readonly EventSeedData[];

interface CanvasSeedData {
  id: number;
  name: string;
  locked: boolean;
  event_id: number;
  width: number;
  height: number;
  cooldown_length: number; // in seconds
  start_coordinates: [number, number];
}

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
] as const satisfies readonly CanvasSeedData[];
