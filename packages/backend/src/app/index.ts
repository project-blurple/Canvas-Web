import cors, { type CorsOptions } from "cors";
import express from "express";

import config from "@/config";
import { initializeAuth } from "@/middleware/discordAuth";
import { errorHandler } from "@/middleware/errorHandler";
import { apiRouter } from "@/routes";
import { initializeCache } from "@/services/canvasService";
import "@/utils";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { SocketHandler } from "./SocketHandler";

interface App {
  socketHandler: SocketHandler;
}

export function createApp(): App {
  const app = express();

  const corsOptions = {
    origin: [config.frontendUrl, "http://localhost:3000"],
    credentials: true,
  } satisfies CorsOptions;
  app.use(cors(corsOptions));

  app.set("trust proxy", 1 /* number of proxies between user and server */);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  initializeAuth(app);
  app.use(apiRouter);
  app.use(errorHandler);

  initializeCache();

  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: [config.frontendUrl, "http://localhost:3000"],
    },
  });

  const socketHandler = new SocketHandler(io);

  server.listen(config.api.port, () => {
    console.log(`⚡[server]: Server is running on port ${config.api.port}`);
  });

  return { socketHandler };
}
