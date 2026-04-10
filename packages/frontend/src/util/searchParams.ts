import { Point } from "@blurple-canvas-web/types";
import config from "@/config";

type SearchParamConfig = {
  readonly canonical: string;
  readonly aliases: readonly string[];
};

export const SEARCH_PARAM_KEYS = {
  canvasId: { canonical: "c", aliases: ["canvas"] },
  x: { canonical: "x", aliases: [] },
  y: { canonical: "y", aliases: [] },
  z: { canonical: "z", aliases: ["zoom"] },
  pixelWidth: { canonical: "w", aliases: ["width"] },
  pixelHeight: { canonical: "h", aliases: ["height"] },
  frameId: { canonical: "f", aliases: ["frame"] },
} as const satisfies Record<string, SearchParamConfig>;

export type ParamKey = keyof typeof SEARCH_PARAM_KEYS;

type ParamVariant<K extends ParamKey> =
  | (typeof SEARCH_PARAM_KEYS)[K]["canonical"]
  | (typeof SEARCH_PARAM_KEYS)[K]["aliases"][number];

function getSearchParamVariants<K extends ParamKey>(
  key: K,
): readonly ParamVariant<K>[] {
  const config = SEARCH_PARAM_KEYS[key];
  return [config.canonical, ...config.aliases];
}

export default function createPixelUrl({
  canvasId,
  coords,
  zoom,
  pixelWidth,
  pixelHeight,
  frameId,
}: {
  canvasId?: number;
  coords?: Point;
  zoom?: number;
  pixelWidth?: number;
  pixelHeight?: number;
  frameId?: string;
}) {
  const parameters = new Map<string, string>();

  const params = [
    { key: SEARCH_PARAM_KEYS.canvasId.canonical, value: canvasId?.toString() },
    { key: SEARCH_PARAM_KEYS.x.canonical, value: coords?.x.toString() },
    { key: SEARCH_PARAM_KEYS.y.canonical, value: coords?.y.toString() },
    { key: SEARCH_PARAM_KEYS.z.canonical, value: zoom?.toFixed(3) },
    {
      key: SEARCH_PARAM_KEYS.pixelWidth.canonical,
      value: pixelWidth?.toFixed(0),
    },
    {
      key: SEARCH_PARAM_KEYS.pixelHeight.canonical,
      value: pixelHeight?.toFixed(0),
    },
    { key: SEARCH_PARAM_KEYS.frameId.canonical, value: frameId?.toUpperCase() },
  ];

  for (const param of params) {
    if (param.value) {
      parameters.set(param.key, param.value);
    }
  }

  const url = new URL(config.baseUrl);

  url.search = Array.from(parameters.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return url.toString();
}

export function extractSearchParam(
  searchParams: URLSearchParams | null,
  key: ParamKey,
): string | null {
  if (!searchParams) return null;

  return (
    getSearchParamVariants(key)
      .map((variant) => searchParams.get(variant))
      .find((value): value is string => value !== null && value.length > 0) ??
    null
  );
}
