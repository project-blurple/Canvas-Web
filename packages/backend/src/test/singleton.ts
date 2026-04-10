import { PrismockClientType } from "prismock/build/main/lib/client";
import { prisma } from "@/client";

vi.mock("@prisma/client", async () => {
  const prismock = await vi.importActual("prismock");
  return {
    ...vi.importActual("@prisma/client"),
    PrismaClient: prismock.PrismockClient,
  };
});

afterEach(() => {
  const prismock = prisma as PrismockClientType;
  prismock.reset();
});
