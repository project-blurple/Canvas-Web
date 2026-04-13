import { DiscordGuildRecord } from "./discordGuildRecord";
import { DiscordUserProfile } from "./discordUserProfile";

export interface BaseFrame {
  id: string;
  canvasId: number;
  ownerId: string;
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface UserFrame extends BaseFrame {
  isGuildOwned: false;
  ownerUser: DiscordUserProfile;
  ownerGuild?: undefined;
}

export interface GuildFrame extends BaseFrame {
  isGuildOwned: true;
  ownerUser?: undefined;
  ownerGuild: DiscordGuildRecord;
}

export type Frame = UserFrame | GuildFrame;
