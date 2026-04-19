import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/client/generated/client";
import config from "@/config";

const adapter = new PrismaPg(config.databaseUrl);

export const prisma = new PrismaClient({ adapter });

export * from "@/client/generated/client";
