import { PlacePixelSocket } from "@blurple-canvas-web/types";
import { Server, Socket } from "socket.io";
import { prisma } from "@/client";

const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

function timestampTooLongAgo(timestamp: string): boolean {
  return Date.now() - new Date(timestamp).getTime() > TEN_MINUTES_IN_MS;
}

async function resyncClient(
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

    for (const pixel of pixels) {
      socket.emit(
        `place pixel ${canvasId}`,
        {
          x: pixel.x,
          y: pixel.y,
          color: pixel.color.rgba,
        },
        new Date().toISOString(),
      );
    }
  } catch (error) {
    console.error(
      `[Socket ${socket.id}]: Error fetching new placed pixels: ${error}`,
    );
  }
}

export class SocketHandler {
  public constructor(private io: Server) {
    this.io.on("connection", this.onConnection);
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

    resyncClient(socket, canvasId, pixelTimestamp);
  }

  public broadcastPixelPlacement(
    canvasId: number,
    payload: PlacePixelSocket.Payload,
  ) {
    this.io.emit(`place pixel ${canvasId}`, payload);
  }
}
