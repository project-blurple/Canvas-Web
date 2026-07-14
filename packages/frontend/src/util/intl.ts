export const durationFormatNarrow =
  "DurationFormat" in Intl ?
    new Intl.DurationFormat("en-US", { style: "narrow" })
  : undefined;

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
  style: "short",
});

const RELATIVE_TIME_UNITS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "seconds"],
  [60, "minutes"],
  [24, "hours"],
  [30, "days"],
  [12, "months"],
  [Infinity, "years"],
];

/**
 * Format a timestamp as a relative time string (e.g. "2 hours ago", "just now").
 * Uses `Intl.RelativeTimeFormat` under the hood.
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);

  if (Math.abs(diffSeconds) < 10) {
    return "just now";
  }

  let unit: Intl.RelativeTimeFormatUnit = "seconds";
  let value = diffSeconds;

  for (const [threshold, u] of RELATIVE_TIME_UNITS) {
    if (Math.abs(value) < threshold) {
      unit = u;
      break;
    }
    value = Math.round(value / threshold);
    unit = u;
  }

  return relativeTimeFormatter.format(value, unit);
}
