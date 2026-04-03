/** `[r, g, b, a]` */
export type PixelColor = [number, number, number, number];

export interface PaletteColor {
  id: number;
  code: string;
  name: string;
  rgba: PixelColor;
  global: boolean;
  invite: string | null;
  guildName: string | null;
  guildId: string;
}

export type Palette = PaletteColor[];
