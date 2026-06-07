import cors from "cors";
import express from "express";
import { trace, type Span } from "@opentelemetry/api";

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

type RequestWithRootSpan = express.Request & {
  __otelRootSpan?: Span;
};

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

  app.use((req, _res, next) => {
    const span =
      (req as RequestWithRootSpan).__otelRootSpan ?? trace.getActiveSpan();

    if (span && req.user) {
      span.setAttributes({
        "canvas.auth.userId": req.user.id,
        "canvas.auth.username": req.user.username,
        "canvas.auth.isCanvasAdmin": Boolean(req.user.isCanvasAdmin),
        "canvas.auth.isCanvasModerator": Boolean(req.user.isCanvasModerator),
      });
    }

    next();
  });

  app.use(apiRouter);
  app.use(errorHandler);

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
