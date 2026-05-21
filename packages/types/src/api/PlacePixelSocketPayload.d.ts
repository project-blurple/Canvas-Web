export interface Payload {
  x: number;
  y: number;
  rgba: number[]; // [r, g, b, a];
}

export interface BulkPayload {
  pixels: Payload[];
}
