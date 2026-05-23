import {
  type CanvasInfo,
  type PixelColor,
  type PlacePixelSocket,
  SocketEvents,
} from "@blurple-canvas-web/types";
import type { Server, Socket } from "socket.io";
import { prisma } from "@/client";

const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

function timestampTooLongAgo(timestamp: string): boolean {
  return Date.now() - new Date(timestamp).getTime() > TEN_MINUTES_IN_MS;
}

export class SocketHandler {
  public constructor(private io: Server) {
    this.io.on("connection", this.onConnection.bind(this));
  }

  onConnection(socket: Socket) {
    console.log(`[Socket ${socket.id}]: Client connected`);

    socket.on("disconnect", () => {
      console.log(`[Socket ${socket.id}]: Client disconnected`);
    });

    // If the socket wasn't able to automatically recover after a temporary disconnection, we can
    // use these values to determine what pixels they received last.
    const { pixelTimestamp, canvasId } = socket.handshake.auth;

    const shouldResync =
      !socket.recovered &&
      pixelTimestamp &&
      canvasId &&
      !timestampTooLongAgo(pixelTimestamp);

    if (!shouldResync) {
      return;
    }

    this.resyncClient(socket, canvasId, pixelTimestamp);
  }

  private async resyncClient(
    socket: Socket,
    canvasId: number,
    pixelTimestamp: string,
  ) {
    try {
      const pixels = await prisma.history.findMany({
        select: {
          x: true,
          y: true,
          color: { select: { rgba: true } },
        },
        where: {
          erased_at: null,
          canvas_id: canvasId,
          timestamp: {
            // Greater than or equal as multiple pixels may have been placed at the same time and
            // we don't know which ones they received.
            gte: pixelTimestamp,
          },
        },
      });

      console.log(
        `[Socket ${socket.id}]: Synchronizing client requires ${pixels.length} pixels to be sent`,
      );

      this.broadcastPixelBulkPlacement(canvasId, {
        pixels: pixels.map((pixel) => ({
          x: pixel.x,
          y: pixel.y,
          rgba: pixel.color.rgba as PixelColor,
        })),
      });
    } catch (error) {
      console.error(
        `[Socket ${socket.id}]: Error fetching new placed pixels: ${error}`,
      );
    }
  }

  public broadcastPixelPlacement(
    canvasId: CanvasInfo["id"],
    payload: PlacePixelSocket.Payload,
  ) {
    this.io.emit(SocketEvents.placePixel(canvasId), payload);
  }

  public broadcastPixelBulkPlacement(
    canvasId: CanvasInfo["id"],
    payload: PlacePixelSocket.BulkPayload,
  ) {
    this.io.emit(SocketEvents.placePixelBulk(canvasId), payload);
  }

  public broadcastCanvasUpdate(payload: CanvasInfo) {
    this.io.emit(SocketEvents.canvasUpdate, payload);
  }
}
