import { Router } from "express";

export const blacklistRouter = Router();

blacklistRouter.get("/", async (_req, res) => {
  return res.status(504).json({ message: "Not implemented" });
});

blacklistRouter.post("/", async (_req, res) => {
  return res.status(504).json({ message: "Not implemented" });
});

blacklistRouter.delete("/", async (_req, res) => {
  return res.status(504).json({ message: "Not implemented" });
});
