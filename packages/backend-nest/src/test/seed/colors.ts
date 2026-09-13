import { testPrisma as prisma } from "../database";

// Only have 4 colours for testing purposes; selected colours reflect prod database
export async function seedColors() {
  await prisma.color.createMany({
    data: [
      {
        id: 1,
        code: "blank",
        emojiName: "pl_blank",
        emojiId: BigInt("540761786484391957"),
        global: true,
        name: "Blank tile",
        rgba: [88, 101, 242, 127],
      },
      {
        id: 2,
        code: "blpl",
        emojiName: "pl_blpl",
        emojiId: BigInt("971623647758401566"),
        global: true,
        name: "Blurple",
        rgba: [88, 101, 242, 255],
      },
      {
        id: 3,
        code: "red",
        emojiName: "pl_red",
        emojiId: BigInt("572564652559564810"),
        global: false,
        name: "Red",
        rgba: [234, 35, 40, 255],
      },
      {
        id: 4,
        code: "blue",
        emojiName: "pl_blue",
        emojiId: BigInt("840064486374637608"),
        global: false,
        name: "Blue",
        rgba: [0, 90, 166, 255],
      },
    ],
  });
}
