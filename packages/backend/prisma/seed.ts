// @ts-expect-error
import console from "node:console";
// @ts-expect-error
import process from "node:process";
import { PrismaClient } from "../build/client/generated/client.js";
import {
  canvasSeedData,
  colorSeedData,
  discordGuildRecordSeedData,
  eventSeedData,
  guildSeedData,
  infoSeedData,
  participationSeedData,
} from "./seedData";

const prisma = new PrismaClient();

const OVERRIDE = true;
const USERS = 50_000 + Math.floor(Math.random() * 50_000);

async function main() {
  const allSeedings = [
    "blacklist",
    "canvas",
    "color",
    "cooldown",
    "discord_user_profile",
    "discord_guild_record",
    "event",
    "frame",
    "guild",
    "history",
    "info",
    "participation",
    "pixel",
    "user",
    "session",
  ] as const;
  type Seeding = (typeof allSeedings)[number];
  const seedings: Seeding[] = [...allSeedings];

  if (!OVERRIDE)
    for (const seeding of seedings) {
      const count = (await prisma[seeding].count()) as
        | number
        | undefined
        | null;
      if (count && count >= 1) seedings.splice(seedings.indexOf(seeding), 1);
    }

  if (seedings.length === 0) return;

  const order: Seeding[] = [
    "pixel",
    "participation",
    "info",
    "history",
    "guild",
    "frame",
    "cooldown",
    "canvas",
    "blacklist",
    "session",
    "user",
    "event",
    "discord_guild_record",
    "discord_user_profile",
    "color",
  ];
  await prisma.$transaction([
    ...seedings
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      .map((seeding) => prisma[seeding].deleteMany()),
  ]);

  const userNumber = Math.max(51, USERS);
  const userIds = new Set<number>();
  while (userIds.size < userNumber)
    userIds.add(Math.floor(Math.random() * 900_000) + 100_000);

  if (seedings.includes("color")) {
    await prisma.color.createMany({
      data: colorSeedData,
    });
    console.log("Seeded color");
  }

  if (seedings.includes("discord_user_profile")) {
    await prisma.discord_user_profile.createMany({
      data: Array.from(userIds).map((userId) => ({
        user_id: userId,
        username: `User ${userId}`,
        profile_picture_url: "https://discord.com/assets/788f05731f8aa02e.png",
      })),
    });
    console.log("Seeded discord_user_profile");
  }

  if (seedings.includes("discord_guild_record")) {
    await prisma.discord_guild_record.createMany(discordGuildRecordSeedData());
    console.log("Seeded discord_guild_record");
  }

  // === EVENT ===
  if (seedings.includes("event")) {
    await prisma.event.createMany({
      data: eventSeedData,
    });
    console.log("Seeded event");
  }

  if (seedings.includes("user")) {
    await prisma.user.createMany({
      data: Array.from(userIds).map((userId) => ({
        id: userId,
        current_canvas_id:
          Math.random() < 0.25 ?
            Math.random() < 0.5 ?
              undefined
            : 1901
          : 1902,
      })),
    });
    console.log("Seeded user");
  }

  /// === SESSION ===
  if (seedings.includes("session")) {
    // await prisma.session.createMany({ data: [] });
    // Sessions are generated dynamically based on user activity, so we don't need to seed any initial data for them
    console.log("Seeded session");
  }

  // === BLACKLIST ===
  if (seedings.includes("blacklist")) {
    // await prisma.blacklist.createMany({ data: [] });
    // Leaving empty to start. Users can be added to the blacklist through the mod panel.
    console.log("Seeded blacklist");
  }

  // === CANVAS ===
  if (seedings.includes("canvas")) {
    await prisma.canvas.createMany({ data: canvasSeedData });
    console.log("Seeded canvas");
  }

  // === COOLDOWN ===
  if (seedings.includes("cooldown")) {
    // await prisma.cooldown.createMany({ data: [] });
    // Cooldowns are generated dynamically based on user activity, so we don't need to seed any initial data for them
    console.log("Seeded cooldown");
  }

  if (seedings.includes("frame")) {
    await prisma.frame.createMany({
      data: [
        {
          id: "901",
          canvas_id: 1901,
          owner_id: Array.from(userIds)[10],
          is_guild_owned: false,
          name: "First Frame",
          x_0: 10,
          x_1: 20,
          y_0: 10,
          y_1: 20,
        },
        {
          id: "902",
          canvas_id: 1902,
          owner_id: Array.from(userIds)[10],
          is_guild_owned: false,
          name: "Second Frame",
          x_0: 20,
          x_1: 30,
          y_0: 20,
          y_1: 30,
        },
      ],
    });
    console.log("Seeded frame");
  }

  // === GUILD ===
  if (seedings.includes("guild")) {
    await prisma.guild.createMany({ data: guildSeedData() });
    console.log("Seeded guild");
  }

  if (seedings.includes("history")) {
    await prisma.history.createMany({
      data: [
        ...Array.from({ length: 1000 }).map(() => ({
          user_id:
            Array.from(userIds)[Math.floor(Math.random() * userIds.size)],
          canvas_id: 1901,
          x: Math.floor(Math.random() * 50),
          y: Math.floor(Math.random() * 50),
          color_id: [2, 3, 4, 101, 102][Math.floor(Math.random() * 5)],
          timestamp: new Date(
            Date.now() - Math.floor(Math.random() * 1_000_000),
          ),
          guild_id: null,
        })),
        ...Array.from({ length: 8000 }).map(() => ({
          user_id:
            Array.from(userIds)[Math.floor(Math.random() * userIds.size)],
          canvas_id: 1902,
          x: Math.floor(Math.random() * 100),
          y: Math.floor(Math.random() * 100),
          color_id: [2, 3, 4, 101, 102][Math.floor(Math.random() * 5)],
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 500_000)),
          guild_id: null,
        })),
        ...Array.from({ length: 150 + Math.floor(Math.random() * 150) }).map(
          () => ({
            user_id:
              Array.from(userIds)[Math.floor(Math.random() * userIds.size)],
            canvas_id: 1902,
            x: 0,
            y: 0,
            color_id: [2, 3][Math.floor(Math.random() * 2)],
            timestamp: new Date(
              Date.now() - Math.floor(Math.random() * 200_000),
            ),
          }),
        ),
      ],
    });
    console.log("Seeded history");
  }

  // === INFO ===
  if (seedings.includes("info")) {
    await prisma.info.create({ data: infoSeedData });
    console.log("Seeded info");
  }

  // === PARTICIPATION ===
  if (seedings.includes("participation")) {
    await prisma.participation.createMany({ data: participationSeedData() });
    console.log("Seeded participation");
  }

  if (seedings.includes("pixel")) {
    const canvases = await prisma.canvas.findMany();
    const history = await prisma.history.findMany({
      orderBy: {
        timestamp: "desc",
      },
    });

    const canvasMap = new Map<number, Map<number, Map<number, number>>>();
    for (const canvas of canvases) {
      const rowMap = new Map<number, Map<number, number>>();

      for (let y = 0; y < canvas.height; y++)
        rowMap.set(y, new Map<number, number>());
      canvasMap.set(canvas.id, rowMap);
    }

    for (const record of history) {
      const rowMap = canvasMap.get(record.canvas_id);
      if (!rowMap) {
        console.warn(
          `No canvas found for pixel record with canvas_id ${record.canvas_id}`,
        );
        continue;
      }

      const colMap = rowMap.get(record.y);
      if (!colMap) {
        console.warn(
          `No row found for pixel record with canvas_id ${record.canvas_id} at y ${record.y}`,
        );
        continue;
      }

      if (!colMap.has(record.x)) {
        // console.log(`Setting pixel for canvas ${record.canvas_id} at (${record.x}, ${record.y}) to color ${record.color_id}`);
        colMap.set(record.x, record.color_id);
      }
    }

    const pixels: Array<{
      canvas_id: number;
      x: number;
      y: number;
      color_id: number;
    }> = [];

    for (const canvas of canvases) {
      const rowMap = canvasMap.get(canvas.id);
      if (!rowMap) continue;

      for (let y = 0; y < canvas.height; y++) {
        const colMap = rowMap.get(y);
        if (!colMap) continue;

        for (let x = 0; x < canvas.width; x++) {
          pixels.push({
            canvas_id: canvas.id,
            x,
            y,
            color_id: colMap.get(x) ?? 1,
          });
        }
      }
    }

    await prisma.pixel.createMany({ data: pixels });
    console.log("Seeded pixel");
  }
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
