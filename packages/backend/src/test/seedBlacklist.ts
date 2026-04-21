import { prisma } from "@/client";

export default async function () {
  await prisma.blacklist.create({
    data: {
      user_id: 9,
      date_added: new Date(0),
    },
  });
}
