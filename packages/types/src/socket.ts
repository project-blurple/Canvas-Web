export const SocketEvents = {
  canvasUpdate: "canvas update",
  canvasUpdateForCanvas(canvasId: number) {
    return `canvas update ${canvasId}` as const;
  },
  placePixel(canvasId: number) {
    return `place pixel ${canvasId}` as const;
  },
} as const;
