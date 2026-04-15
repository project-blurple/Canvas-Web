import { DiscordGuildRecord } from "./discordGuildRecord";
import { DiscordUserProfile } from "./discordUserProfile";

export type FrameOwnerType = "USER" | "GUILD" | "SYSTEM";

export interface BaseFrame {
  id: string;
  canvasId: number;
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface UserOwnedFrame extends BaseFrame {
  owner: {
    type: "USER";
    user: DiscordUserProfile;
  };
}

export interface GuildOwnedFrame extends BaseFrame {
  owner: {
    type: "GUILD";
    guild: DiscordGuildRecord;
  };
}

export interface SystemOwnedFrame extends BaseFrame {
  owner: {
    type: "SYSTEM";
    name: "Blurple Canvas";
  };
}

export type Frame = UserOwnedFrame | GuildOwnedFrame | SystemOwnedFrame;
