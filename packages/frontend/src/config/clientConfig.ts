/**
 * Configuration available in both server and client components. These environment variables need to
 * be prefixed with NEXT_PUBLIC_ to be included in the client bundle.
 */
const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  discordServerInvite:
    process.env.NEXT_PUBLIC_DISCORD_SERVER_INVITE ||
    "https://projectblurple.com",
  showBotCommands: process.env.NEXT_PUBLIC_SHOW_BOT_COMMANDS === "true",
} as const;

export default config;
