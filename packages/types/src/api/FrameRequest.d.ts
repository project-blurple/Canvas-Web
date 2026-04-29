import type {
  DiscordGuildRecord,
  DiscordUserProfile,
  Frame,
  GuildOwnedFrame,
  UserOwnedFrame,
} from "..";

export interface Params {
  frameId?: Frame["id"];
  canvasId?: Frame["canvasId"];
  userId?: DiscordUserProfile["id"];
  guildIds?: DiscordGuildRecord["guild_id"][];
}

export type ResBody = Frame[];
export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
export type FrameByIdResBody = Frame;

export interface UserFramesResBody {
  data: UserOwnedFrame[];
  isAtCountLimit: boolean;
}
export interface GuildFramesResBody {
  data: GuildOwnedFrame[];
  isAtCountLimit: {
    [guildId: string]: boolean;
  };
}
