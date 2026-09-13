import { canvasSeedData } from "../data/events";
import type { Seeding } from "./types";

export const canvasSeeding: Seeding = {
  name: "canvas",
  count: (prisma) => prisma.canvas.count(),
  async clean(prisma) {
    await prisma.canvas.deleteMany();
  },
  async seed(prisma) {
    await prisma.canvas.createMany({ data: [...canvasSeedData] });
  },
};
