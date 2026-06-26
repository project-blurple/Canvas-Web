import { CanvasPlaceState } from "@blurple-canvas-web/types";
import type { Prisma } from "../../common/database/generated/client";

export const infoSeedData: Prisma.InfoUncheckedCreateInput = {
  title: "Canvas Dev",
  canvasAdmin: [708540954302218311n],
  currentEventId: 2034,
  cachedCanvasIds: [2024, 2034],
  adminServerId: 412754940885467146n,
  /** @privateRemarks This is for the bot, not used by the web app */
  currentEmojiServerId: 412754940885467146n,
  hostServerId: 412754940885467146n,
  defaultCanvasId: 2034,
};

export const eventSeedData = [
  {
    id: 2024,
    name: "Canvas 2024",
  },
  {
    id: 2034,
    name: "Testing Event",
  },
] satisfies readonly Prisma.EventCreateManyInput[];

export const canvasSeedData = [
  {
    id: 2024,
    name: "Canvas 2024",
    placeState: CanvasPlaceState.NoOne,
    eventId: 2024,
    width: 700,
    height: 700,
    cooldownLength: 30,
    startCoordinates: [1, 1],
  },
  {
    id: 2034,
    name: "Testing Canvas",
    placeState: CanvasPlaceState.Anyone,
    eventId: 2034,
    width: 100,
    height: 100,
    cooldownLength: 15,
    startCoordinates: [1, 1],
  },
] satisfies readonly Prisma.CanvasCreateManyInput[];
