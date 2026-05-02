// Datetime regex: <t:timestamp:format> or <t:timestamp>
// Discord's format
const DATETIME_REGEX = /<t:(\d+):?([tTdDfFR])?>/g;

function dateToRelativeTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const absDiff = Math.abs(diff);

  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [365 * 24 * 60 * 60 * 1000, "year"],
    [30 * 24 * 60 * 60 * 1000, "month"],
    [24 * 60 * 60 * 1000, "day"],
    [60 * 60 * 1000, "hour"],
    [60 * 1000, "minute"],
    [1000, "second"],
  ];

  for (const [ms, unit] of units) {
    if (absDiff >= ms) {
      const value = Math.round(diff / ms);
      return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
        value,
        unit,
      );
    }
  }

  return "now";
}

function resolveDatetimeText(text: string): string {
  return text.replace(DATETIME_REGEX, (match, timestamp, format) => {
    const date = new Date(Number.parseInt(timestamp, 10) * 1000);
    switch (format) {
      case "t":
        return date.toLocaleTimeString();
      case "T":
        return date.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      case "d":
        return date.toLocaleDateString();
      case "D":
        return date.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "f":
        return date.toLocaleString();
      case "F":
        return date.toLocaleString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      case "R":
        return dateToRelativeTime(date);
      default:
        return match;
    }
  });
}

export function resolveSpecialText(text: string): string {
  text = resolveDatetimeText(text);
  return text;
}
