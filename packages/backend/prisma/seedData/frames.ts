interface FrameSeedData {
  id: string;
  canvas_id: number;
  owner_id: bigint;
  is_guild_owned: boolean;
  name: string;
  x_0: number;
  x_1: number;
  y_0: number;
  y_1: number;
  style_id: number; // Used by the bot, not currently supported in the web app
}

// These frames are real guild frames from the 2024 event
// Does not include any user-owned frames
export const frameSeedData: FrameSeedData[] = [
  {
    id: "08D565",
    canvas_id: 2024,
    owner_id: 412754940885467146n,
    is_guild_owned: true,
    name: "5665",
    x_0: 0,
    x_1: 63,
    y_0: 0,
    y_1: 63,
    style_id: 2,
  },
  {
    id: "1CA85F",
    canvas_id: 2024,
    owner_id: 412754940885467146n,
    is_guild_owned: true,
    name: "HOT7",
    x_0: 50,
    x_1: 200,
    y_0: 280,
    y_1: 390,
    style_id: 1,
  },
  {
    id: "46F08A",
    canvas_id: 2024,
    owner_id: 412754940885467146n,
    is_guild_owned: true,
    name: "Grogu",
    x_0: 385,
    x_1: 427,
    y_0: 329,
    y_1: 362,
    style_id: 2,
  },
  {
    id: "8F0AB8",
    canvas_id: 2024,
    owner_id: 412754940885467146n,
    is_guild_owned: true,
    name: "Cherrys",
    x_0: 249,
    x_1: 360,
    y_0: 9,
    y_1: 24,
    style_id: 1,
  },
  {
    id: "97F04B",
    canvas_id: 2024,
    owner_id: 412754940885467146n,
    is_guild_owned: true,
    name: "Paintbrush",
    x_0: 332,
    x_1: 367,
    y_0: 322,
    y_1: 377,
    style_id: 1,
  },
  {
    id: "E98975",
    canvas_id: 2024,
    owner_id: 412754940885467146n,
    is_guild_owned: true,
    name: "Kiwi Heart",
    x_0: 370,
    x_1: 392,
    y_0: 343,
    y_1: 362,
    style_id: 1,
  },
  {
    id: "F5E7AF",
    canvas_id: 2024,
    owner_id: 412754940885467146n,
    is_guild_owned: true,
    name: "Temp's Community",
    x_0: 99,
    x_1: 697,
    y_0: 0,
    y_1: 25,
    style_id: 1,
  },
];
