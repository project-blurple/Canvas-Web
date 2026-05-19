import { Router } from "express";
import cacheGets from "@/middleware/cache";
import { blocklistRouter } from "./blocklist";
import { canvasRouter } from "./canvas";
import { discordRouter } from "./discord";
import { eventRouter } from "./event";
import { frameRouter } from "./frame";
import { noticeRouter } from "./notice";
import { paletteRouter } from "./palette";
import { statisticsRouter } from "./statistics";

export const apiV1Router = Router();

apiV1Router.use("/blocklist", blocklistRouter);
apiV1Router.use("/canvas", canvasRouter);
apiV1Router.use("/discord", discordRouter);
apiV1Router.use("/event", eventRouter);
apiV1Router.use("/frame", frameRouter, cacheGets(300_000));
apiV1Router.use("/notice", noticeRouter, cacheGets(300_000));
apiV1Router.use("/palette", paletteRouter, cacheGets(600_000));
apiV1Router.use("/statistics", statisticsRouter, cacheGets(300_000));
