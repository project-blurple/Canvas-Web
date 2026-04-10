import { DiscordUserProfile } from "@blurple-canvas-web/types";
import { DateTime } from "luxon";

export { default } from "./searchParams";

/**
 * Return the value clamped so that it is within the range [min, max].
 */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getOrdinalSuffix(rank: number) {
  const trailingDigits = rank % 100;
  if (11 <= trailingDigits && trailingDigits <= 13) {
    return "th";
  }
  switch (rank % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatInterval(interval: string) {
  const [daysStr, time] = interval.split(" ");
  const days = Number.parseInt(daysStr, 10);
  const [hours, minutes, seconds] = time
    .split(":")
    .map((num) => Number.parseInt(num, 10));
  const components = [];
  if (days > 0) components.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0) components.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes > 0)
    components.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  if (seconds > 0)
    components.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
  return components.join("");
}

export function formatTimestamp(timestamp: string, utc = true) {
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return dateToString(date, utc);
}

export function formatTimestampLocalTZ(timestamp: string) {
  return formatTimestamp(timestamp, false);
}

export function dateToString(date: Date, utc?: boolean) {
  let luxonDate = DateTime.fromJSDate(date);
  let format = DateTime.DATETIME_FULL;
  if (utc) {
    luxonDate = luxonDate.toUTC();
  } else {
    format = { ...format, timeZoneName: undefined };
  }
  return luxonDate.toLocaleString(format);
}

export function decodeUserGuildsBase64(user: DiscordUserProfile) {
  const base64 = user.guildIdsBase64 ?? "";
  const guildIds = Buffer.from(base64, "base64").toString("utf-8");
  return guildIds.split(" ");
}
