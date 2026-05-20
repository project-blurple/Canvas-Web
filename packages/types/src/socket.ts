export const SocketEvents = {
  canvasUpdate: "canvas update",
  placePixel(canvasId: number) {
    return `place pixel ${canvasId}` as const;
  },
} as const;
