import type { DiscordGuildRecord } from "./discordGuildRecord";
import type { DiscordUserProfile } from "./discordUserProfile";

/**
 * Enum-like map of valid frame owner types. Available both as runtime values
 * (e.g. `FrameOwnerType.User`) and as a type (the union of its string values).
 */
export enum FrameOwnerType {
  User = "user",
  Guild = "guild",
  System = "system",
}

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
    type: FrameOwnerType.User;
    user: DiscordUserProfile;
  };
}

export interface GuildOwnedFrame extends BaseFrame {
  owner: {
    type: FrameOwnerType.Guild;
    guild: DiscordGuildRecord;
  };
}

export interface SystemOwnedFrame extends BaseFrame {
  owner: {
    type: FrameOwnerType.System;
    name: "Blurple Canvas";
  };
}

export type Frame = UserOwnedFrame | GuildOwnedFrame | SystemOwnedFrame;
