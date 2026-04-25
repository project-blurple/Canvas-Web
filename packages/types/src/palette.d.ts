/** `[r, g, b, a]` */
export type PixelColor = [number, number, number, number];

export interface PaletteColorSummary {
  id: number;
  code: string;
  name: string;
  rgba: PixelColor;
  global: boolean;
}

export interface PaletteColor extends PaletteColorSummary {
  invite: string | null;
  guildName: string | null;
  guildId: string;
}

export type Palette = PaletteColor[];
