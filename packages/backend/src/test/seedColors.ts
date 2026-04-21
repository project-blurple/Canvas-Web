import { prisma } from "@/client";

// Only have 4 colours for testing purposes; selected colours reflect prod database
export default async function () {
  await prisma.color.createMany({
    data: [
      {
        id: 1,
        code: "blank",
        emoji_name: "pl_blank",
        emoji_id: BigInt("540761786484391957"),
        global: true,
        name: "Blank tile",
        rgba: [88, 101, 242, 127],
      },
      {
        id: 2,
        code: "blpl",
        emoji_name: "pl_blpl",
        emoji_id: BigInt("971623647758401566"),
        global: true,
        name: "Blurple",
        rgba: [88, 101, 242, 255],
      },
      {
        id: 3,
        code: "red",
        emoji_name: "pl_red",
        emoji_id: BigInt("572564652559564810"),
        global: false,
        name: "Red",
        rgba: [234, 35, 40, 255],
      },
      {
        id: 4,
        code: "blue",
        emoji_name: "pl_blue",
        emoji_id: BigInt("840064486374637608"),
        global: false,
        name: "Blue",
        rgba: [0, 90, 166, 255],
      },
    ],
  });
}
