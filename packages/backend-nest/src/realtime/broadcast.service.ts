import {
  type CanvasInfo,
  type PlacePixelSocket,
  SocketEvents,
} from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";

@Injectable()
export class BroadcastService {
  // Attached by RealtimeGateway once Nest has created the Socket.IO server.
  private server?: Server;

  attachServer(server: Server): void {
    this.server = server;
  }

  broadcastPixel(
    canvasId: CanvasInfo["id"],
    payload: PlacePixelSocket.Payload,
  ): void {
    this.server?.emit(SocketEvents.placePixel(canvasId), payload);
  }

  broadcastPixelsBulk(
    canvasId: CanvasInfo["id"],
    payload: PlacePixelSocket.BulkPayload,
  ): void {
    this.server?.emit(SocketEvents.placePixelBulk(canvasId), payload);
  }

  broadcastCanvasInfo(payload: CanvasInfo): void {
    this.server?.emit(SocketEvents.canvasUpdate, payload);
  }

  broadcastNoticeUpdate(): void {
    this.server?.emit(SocketEvents.noticeUpdate);
  }
}
