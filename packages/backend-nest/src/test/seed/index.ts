import { seedBlacklist } from "./blacklist";
import { seedCanvases } from "./canvases";
import { seedColors } from "./colors";
import { seedDiscordProfiles } from "./discord-profiles";
import { seedEvents } from "./events";
import { seedGuilds } from "./guilds";
import { seedHistory } from "./history";
import { seedPixels } from "./pixels";
import { seedUsers } from "./users";

export async function seedAll() {
  // Ordered to respect foreign key constraints
  await seedEvents();
  await seedUsers();
  await seedGuilds();
  await seedDiscordProfiles();
  await seedCanvases();
  await seedColors();
  await seedBlacklist();
  await seedPixels();
  await seedHistory();
}
