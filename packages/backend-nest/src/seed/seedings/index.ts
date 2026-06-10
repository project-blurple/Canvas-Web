import { canvasSeeding } from "./canvas";
import { colorSeeding } from "./color";
import { discordGuildRecordSeeding } from "./discord-guild-record";
import { discordUserProfileSeeding } from "./discord-user-profile";
import { eventSeeding } from "./event";
import { frameSeeding } from "./frame";
import { guildSeeding } from "./guild";
import { historySeeding } from "./history";
import { infoSeeding } from "./info";
import { participationSeeding } from "./participation";
import { pixelSeeding } from "./pixel";
import type { Seeding } from "./types";
import { userSeeding } from "./user";
import { webGuildSeeding } from "./web-guild";

export type { SeedClient, Seeding } from "./types";

/** All seedings, in seeding order. Cleanup runs in the reverse order. */
export const seedings: readonly Seeding[] = [
  userSeeding,
  discordUserProfileSeeding,
  discordGuildRecordSeeding,
  webGuildSeeding,
  guildSeeding,
  colorSeeding,
  eventSeeding,
  infoSeeding,
  canvasSeeding,
  participationSeeding,
  frameSeeding,
  pixelSeeding,
  historySeeding,
];
