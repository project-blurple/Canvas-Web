export const SocketEvents = {
  canvasUpdate: "canvas update",
  placePixel(canvasId: number) {
    return `place pixel ${canvasId}` as const;
  },
  placePixelBulk(canvasId: number) {
    return `place pixel bulk ${canvasId}` as const;
  },
} as const;
