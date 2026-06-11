import type { INestApplication } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import type { ServerOptions } from "socket.io";

import { type AppConfig, appConfig } from "@/config/app.config";

export class RealtimeIoAdapter extends IoAdapter {
  private readonly frontendUrl: string;

  constructor(app: INestApplication) {
    super(app);
    this.frontendUrl = app.get<AppConfig>(appConfig.KEY).frontendUrl;
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.frontendUrl },
    });
  }
}
