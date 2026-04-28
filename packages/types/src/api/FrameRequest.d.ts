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

export type UserFramesResBody = {
  data: UserOwnedFrame[];
  isAtCountLimit: boolean;
};
export type GuildFramesResBody = {
  data: GuildOwnedFrame[];
  isAtCountLimit: {
    [guildId: string]: boolean;
  };
};

export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;
