import { DiscordGuildRecord } from "./discordGuildRecord";
import { DiscordUserProfile } from "./discordUserProfile";
import { ValuesOf } from "./utils/index";

export const FrameOwnerType = {
  User: "user",
  Guild: "guild",
  System: "system",
} as const;

export type FrameOwnerType = ValuesOf<typeof FrameOwnerType>;

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
    type: typeof FrameOwnerType.User;
    user: DiscordUserProfile;
  };
}

export interface GuildOwnedFrame extends BaseFrame {
  owner: {
    type: typeof FrameOwnerType.Guild;
    guild: DiscordGuildRecord;
  };
}

export interface SystemOwnedFrame extends BaseFrame {
  owner: {
    type: typeof FrameOwnerType.System;
    name: "Blurple Canvas";
  };
}

export type Frame = UserOwnedFrame | GuildOwnedFrame | SystemOwnedFrame;
