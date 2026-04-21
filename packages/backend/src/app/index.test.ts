import { prisma } from "@/client";
import seedAll from "@/test";

describe("Test Prisma Stuff", () => {
  beforeEach(async () => {
    await seedAll();
  });

  it("can write to prisma instance", async () => {
    await prisma.canvas.create({
      data: { id: 100, name: "New Canvas", width: 2, height: 2 },
    });
    const canvas = await prisma.canvas.findFirst({
      where: { name: "New Canvas" },
    });
    expect(canvas?.name).toStrictEqual("New Canvas");
  });

  it("resets after each test", async () => {
    const canvas = await prisma.canvas.findMany();
    expect(canvas.length).toEqual(2);
  });
});
