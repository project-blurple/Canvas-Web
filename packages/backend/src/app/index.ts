import cors from "cors";
import express from "express";

import config from "@/config";
import { apiRouter } from "@/routes";
import "@/utils";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { initializeAuth } from "@/middleware/auth";
import { initializeCache } from "@/services/canvasService";
import { SocketHandler } from "./SockerHandler";

interface App {
  socketHandler: SocketHandler;
}

export function createApp(): App {
  const app = express();

  const corsOptions = {
    origin: config.frontendUrl,
    credentials: true,
  };
  app.use(cors(corsOptions));

  app.set("trust proxy", 1 /* number of proxies between user and server */);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  initializeAuth(app);
  app.use(apiRouter);

  initializeCache();

  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: config.frontendUrl,
    },
  });

  const socketHandler = new SocketHandler(io);

  server.listen(config.api.port, () => {
    console.log(`⚡[server]: Server is running on port ${config.api.port}`);
  });

  return { socketHandler };
}
