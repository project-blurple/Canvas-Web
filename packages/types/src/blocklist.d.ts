import type { DiscordUserProfile } from "./discordUserProfile";

export interface BlocklistEntry {
  userId: bigint;
  dateAdded: Date;
  username: DiscordUserProfile["username"] | null;
  profilePictureUrl: DiscordUserProfile["profilePictureUrl"] | null;
}
