import config from "@/config";

const availableCanvasIds = new Set(config.snapshot.availableForCanvases);

export function isSnapshotGenerationEnabled(): boolean {
  return config.snapshot.generateSnapshots;
}

export function isSnapshotAvailableForCanvas(canvasId: number): boolean {
  return availableCanvasIds.has(canvasId);
}
