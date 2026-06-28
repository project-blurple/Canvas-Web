import type { SnapshotCursor } from "@/common/database/snapshot/snapshot-prisma.client";
import {
  computeLowerBound,
  getWindowCutoff,
  shouldGenerate,
} from "./snapshot-windows";

function cursor(overrides: Partial<SnapshotCursor> = {}): SnapshotCursor {
  return {
    canvasId: 1,
    lastProcessedTimestamp: new Date(0),
    dirtyFromTimestamp: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("getWindowCutoff", () => {
  it("snaps down to the 10-minute grid", () => {
    expect(getWindowCutoff(new Date(1_234_567))).toEqual(new Date(1_200_000));
    expect(getWindowCutoff(new Date(600_000))).toEqual(new Date(600_000));
    expect(getWindowCutoff(new Date(599_999))).toEqual(new Date(0));
  });
});

describe("computeLowerBound", () => {
  it("uses the earliest effective timestamp across cursors, snapped to the grid", () => {
    const bound = computeLowerBound([
      cursor({ lastProcessedTimestamp: new Date(1_900_000) }),
      cursor({ canvasId: 2, lastProcessedTimestamp: new Date(700_000) }),
    ]);

    expect(bound).toEqual(new Date(600_000));
  });

  it("prefers a dirty marker over the processed timestamp", () => {
    const bound = computeLowerBound([
      cursor({
        lastProcessedTimestamp: new Date(1_900_000),
        dirtyFromTimestamp: new Date(650_000),
      }),
    ]);

    expect(bound).toEqual(new Date(600_000));
  });

  it("falls back to epoch when there are no cursors", () => {
    expect(computeLowerBound([])).toEqual(new Date(0));
  });
});

describe("shouldGenerate", () => {
  it("is due when the cursor has not reached the window end", () => {
    expect(
      shouldGenerate(
        cursor({ lastProcessedTimestamp: new Date(0) }),
        new Date(600_000),
      ),
    ).toBe(true);
  });

  it("is due when dirty marker is at or before the window end", () => {
    expect(
      shouldGenerate(
        cursor({
          lastProcessedTimestamp: new Date(600_000),
          dirtyFromTimestamp: new Date(300_000),
        }),
        new Date(600_000),
      ),
    ).toBe(true);
  });

  it("is not due when the cursor has already passed the window end", () => {
    expect(
      shouldGenerate(
        cursor({ lastProcessedTimestamp: new Date(600_000) }),
        new Date(600_000),
      ),
    ).toBe(false);
  });
});
