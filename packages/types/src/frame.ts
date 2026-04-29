import type { DiscordGuildRecord } from "./discordGuildRecord";
import type { DiscordUserProfile } from "./discordUserProfile";
import type { Satisfies } from "./util";

export type FrameOwnerType = "guild" | "system" | "user";

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
    type: Satisfies<"user", FrameOwnerType>;
    user: DiscordUserProfile;
  };
}

export interface GuildOwnedFrame extends BaseFrame {
  owner: {
    type: Satisfies<"guild", FrameOwnerType>;
    guild: DiscordGuildRecord;
  };
}

export interface SystemOwnedFrame extends BaseFrame {
  owner: {
    type: Satisfies<"system", FrameOwnerType>;
    name: "Blurple Canvas";
  };
}

export type Frame = UserOwnedFrame | GuildOwnedFrame | SystemOwnedFrame;
