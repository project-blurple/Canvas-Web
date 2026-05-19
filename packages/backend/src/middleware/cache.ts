import { styleText } from "node:util";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import Cache from "@/app/Cache";

export const middlewareCache = new Cache();

function log(hit: "hit" | "miss", cacheKey: string) {
  console.debug(
    "Cache",
    styleText(["bold", "green"], hit.toUpperCase()),
    "for",
    styleText(["italic"], cacheKey),
  );
}

export default function cacheGets(staleTimeMs?: number): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method.toUpperCase() !== "GET") next();

    const key = req.originalUrl || req.url;

    if (middlewareCache.has(key)) {
      log("hit", key);
      return res.json(middlewareCache.get(key));
    }

    log("miss", key);

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      middlewareCache.set(key, data, staleTimeMs);
      return originalJson(data);
    };

    next();
  };
}
