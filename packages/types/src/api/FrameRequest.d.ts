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
export type FrameByIdResBody = Frame;
export type UserFramesResBody = UserOwnedFrame[];
export type GuildFramesResBody = GuildOwnedFrame[];
export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
