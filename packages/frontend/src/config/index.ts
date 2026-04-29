const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  port: process.env.PORT || 3000,
  discordServerInvite:
    process.env.NEXT_PUBLIC_DISCORD_SERVER_INVITE ||
    "https://projectblurple.com",
  showBotCommands: process.env.SHOW_BOT_COMMANDS === "true",
} as const;

export default config;
