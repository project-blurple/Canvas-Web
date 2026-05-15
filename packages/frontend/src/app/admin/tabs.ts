export type TabKey = "event" | "canvas" | "color" | "notice" | "paste";

export const tabKeyToPath: Record<TabKey, string> = {
  canvas: "canvas",
  color: "color",
  event: "event",
  notice: "notice",
  paste: "paste",
};

export const pathToTabKey: Record<string, TabKey> = {
  "/admin/canvas": "canvas",
  "/admin/color": "color",
  "/admin/event": "event",
  "/admin/notice": "notice",
  "/admin/paste": "paste",
};

const VALID_TABS = new Set<TabKey>(["event", "canvas", "color"]);

export function isValidTab(tab: string): tab is TabKey {
  return VALID_TABS.has(tab as TabKey);
}
