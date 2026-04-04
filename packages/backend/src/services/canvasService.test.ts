import { NotFoundError } from "@/errors";
import { seedCanvases, seedColors, seedPixels } from "@/test";
import { getCanvases, getCanvasInfo, getCanvasPixels } from "./canvasService";

describe("Canvas Info Tests", () => {
  beforeEach(async () => {
    await seedCanvases();
  });

  it("Gets canvases", async () => {
    expect((await getCanvases()).length).toBe(2);
  });

  it("Gets summary of canvases in desc order", async () => {
    const canvases = await getCanvases();
    expect(canvases).toMatchObject([
      { id: 9, name: "Locked Canvas" },
      { id: 1, name: "Unlocked Canvas" },
    ]);
  });

  it("Gets canvas by ID", async () => {
    expect(await getCanvasInfo(1)).toMatchObject({
      id: 1,
      name: "Unlocked Canvas",
      width: 2,
      height: 2,
      isLocked: false,
      eventId: 1,
      startCoordinates: [1, 1],
    });

    expect(await getCanvasInfo(9)).toMatchObject({
      id: 9,
      name: "Locked Canvas",
      width: 2,
      height: 2,
      isLocked: true,
      eventId: 9,
      startCoordinates: [1, 1],
    });
  });
});

describe("Canvas Validation Tests", () => {
  beforeEach(async () => {
    await seedCanvases();
  });

  it("Resolves valid canvas", async () => {
    return expect(getCanvasInfo(1)).resolves.not.toThrow();
  });

  it("Rejects nonexistent canvas", async () => {
    return expect(getCanvasInfo(9999)).rejects.toThrow(NotFoundError);
  });
});

describe("Canvas Pixels Tests", () => {
  beforeEach(async () => {
    await seedCanvases();
    await seedColors();
    await seedPixels();
  });

  it("Gets canvas pixels", async () => {
    const pixels = await getCanvasPixels(1);
    expect(pixels.length).toBe(4);
    expect(pixels).toStrictEqual([
      [88, 101, 242, 127],
      [88, 101, 242, 255],
      [234, 35, 40, 255],
      [88, 101, 242, 127],
    ]);
  });
});

// TO DO - PNG and Cached Canvas Tests
