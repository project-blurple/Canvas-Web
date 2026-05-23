import type { PaletteColor } from "@/palette";

export interface Params {
  canvasId: number;
}

export type ResBody = Record<string, never>;

export type ReqBody = {
  data: [number, number, PaletteColor["id"]][]; // [x, y, colorId]
  authorId: string;
};
export type ReqQuery = Record<string, never>;
