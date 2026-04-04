import { Prisma, type PrismaClient } from "@prisma/client";
import createPrismaMock from "prisma-mock/client";

type PrismaTestClient = PrismaClient & { $clear: () => void };

const prisma = createPrismaMock<PrismaClient>(Prisma) as PrismaTestClient;

vi.mock("@/client", () => ({
  prisma,
}));

afterEach(() => {
  prisma.$clear();
});
