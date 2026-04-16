import { Router } from "express";

import { canvasRouter } from "./canvas";
import { discordRouter } from "./discord";
import { eventRouter } from "./event";
import { frameRouter } from "./frame";
import { paletteRouter } from "./palette";
import { statisticsRouter } from "./statistics";

export const apiV1Router = Router();

apiV1Router.use("/canvas", canvasRouter);
apiV1Router.use("/discord", discordRouter);
apiV1Router.use("/event", eventRouter);
apiV1Router.use("/frame", frameRouter);
apiV1Router.use("/palette", paletteRouter);
apiV1Router.use("/statistics", statisticsRouter);
