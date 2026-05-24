import type { Point } from "@blurple-canvas-web/types";

interface SearchParamConfig {
  readonly canonical: string;
  readonly aliases: readonly string[];
}

const SEARCH_PARAM_KEYS = {
  canvasId: { canonical: "c", aliases: ["canvas"] },
  x: { canonical: "x", aliases: [] },
  y: { canonical: "y", aliases: [] },
  z: { canonical: "z", aliases: ["zoom"] },
  pixelWidth: { canonical: "w", aliases: ["width"] },
  pixelHeight: { canonical: "h", aliases: ["height"] },
  frameId: { canonical: "f", aliases: ["frame"] },
} as const satisfies Record<string, SearchParamConfig>;

type ParamKey = keyof typeof SEARCH_PARAM_KEYS;

type ParamVariant<K extends ParamKey> =
  | (typeof SEARCH_PARAM_KEYS)[K]["canonical"]
  | (typeof SEARCH_PARAM_KEYS)[K]["aliases"][number];

interface CreatePixelUrlOptions {
  canvasId?: number;
  coords?: Point;
  zoom?: number;
  pixelWidth?: number;
  pixelHeight?: number;
  frameId?: string;
}

function getSearchParamVariants<K extends ParamKey>(
  key: K,
): readonly ParamVariant<K>[] {
  const config = SEARCH_PARAM_KEYS[key];
  return [config.canonical, ...config.aliases];
}

function initParameters({
  coords,
  zoom,
  pixelWidth,
  pixelHeight,
  frameId,
}: CreatePixelUrlOptions) {
  const parameters = new Map<ParamVariant<ParamKey>, string>();

  const params: readonly {
    key: ParamVariant<ParamKey>;
    value: string | undefined;
  }[] = [
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

  return parameters;
}

export default function createPixelUrl({
  canvasId,
  coords,
  zoom,
  pixelWidth,
  pixelHeight,
  frameId,
}: CreatePixelUrlOptions) {
  const parameters = initParameters({
    coords,
    zoom,
    pixelWidth,
    pixelHeight,
    frameId,
  });

  const url = new URL(location.origin);

  if (canvasId !== undefined) {
    url.pathname = `/canvas/${encodeURIComponent(canvasId)}`;
  }

  for (const [key, value] of parameters) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

export function extractSearchParam(
  searchParams: URLSearchParams | null,
  key: ParamKey,
): string | null {
  if (!searchParams) return null;

  const variantUsed = getSearchParamVariants(key).find((variant) => {
    const value = searchParams.get(variant);
    return value !== null && value.length > 0;
  });

  return variantUsed ? searchParams.get(variantUsed) : null;
}

export interface NextSearchParams {
  [key: string]: string | string[] | undefined;
}

function extractSearchParamFromRecord(
  searchParams: NextSearchParams,
  key: ParamKey,
): string | null {
  if (!searchParams) return null;

  const variants = getSearchParamVariants(key);

  for (const variant of variants) {
    const value = searchParams[variant];
    if (Array.isArray(value)) {
      const found = value.find((v) => typeof v === "string" && v.length > 0);
      if (found) return found;
    } else if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

export function extractAllSearchParamsFromRecord(
  searchParams: NextSearchParams,
): Record<ParamKey, string | null> {
  const values = {} as Record<ParamKey, string | null>;

  for (const key of Object.keys(SEARCH_PARAM_KEYS) as ParamKey[]) {
    values[key] = extractSearchParamFromRecord(searchParams, key);
  }

  return values;
}
