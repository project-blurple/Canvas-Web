import { Logger } from "@nestjs/common";
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  WebSocketGateway,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

import { BroadcastService } from "@/realtime/broadcast.service";
import { PixelResyncService } from "@/realtime/pixel-resync.service";

const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

interface HandshakeAuth {
  pixelTimestamp: string;
  canvasId: number;
}

@WebSocketGateway()
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly broadcast: BroadcastService,
    private readonly pixelResync: PixelResyncService,
  ) {}

  afterInit(server: Server): void {
    this.broadcast.attachServer(server);
  }

  async handleConnection(socket: Socket): Promise<void> {
    this.logger.log(`[Socket ${socket.id}]: Client connected`);

    // If the socket wasn't able to automatically recover after a temporary disconnection, we can
    // use these values to determine what pixels they received last.
    const { pixelTimestamp, canvasId } = socket.handshake.auth as HandshakeAuth;

    const shouldResync = Boolean(
      !socket.recovered &&
      pixelTimestamp &&
      canvasId &&
      !this.timestampTooLongAgo(pixelTimestamp),
    );

    if (!shouldResync) {
      return;
    }

    await this.resyncClient(socket, canvasId, pixelTimestamp);
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(`[Socket ${socket.id}]: Client disconnected`);
  }

  private async resyncClient(
    socket: Socket,
    canvasId: HandshakeAuth["canvasId"],
    pixelTimestamp: HandshakeAuth["pixelTimestamp"],
  ): Promise<void> {
    try {
      const pixels = await this.pixelResync.getMissedPixels(
        canvasId,
        pixelTimestamp,
      );

      if (pixels.length > 0) {
        this.logger.log(
          `[Socket ${socket.id}]: Synchronizing client requires ${pixels.length} pixels to be sent`,
        );

        this.broadcast.broadcastPixelsBulk(canvasId, { pixels });
      }
    } catch (error) {
      this.logger.error(
        `[Socket ${socket.id}]: Error fetching new placed pixels: ${error}`,
      );
    }
  }

  private timestampTooLongAgo(timestamp: string): boolean {
    return Date.now() - new Date(timestamp).getTime() > TEN_MINUTES_IN_MS;
  }
}
