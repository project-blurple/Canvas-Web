import ApiError from "./ApiError";

export default class BotNotInGuildError extends ApiError {
  constructor(guildId: string) {
    super(`Discord bot is not in guild ${guildId}`, 403);
  }
}
