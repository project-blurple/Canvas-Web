import { DiscordGuildRecord } from "./discordGuildRecord";
import { DiscordUserProfile } from "./discordUserProfile";

export interface Frame {
  id: string;
  canvasId: number;
  ownerId: string;
  isGuildOwned: boolean;
  ownerUser?: DiscordUserProfile;
  ownerGuild?: DiscordGuildRecord;
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
