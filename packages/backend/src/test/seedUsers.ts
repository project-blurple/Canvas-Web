import { prisma } from "@/client";

export default async function () {
  await prisma.user.createMany({
    data: [{ id: BigInt(1) }, { id: BigInt(9) }],
  });
}
