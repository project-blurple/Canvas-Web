import { testPrisma as prisma } from "./database";
import { seedAll } from "./seed";
import { seedColors } from "./seed/colors";

describe("database harness", () => {
  it("seeds inside the per-test transaction", async () => {
    await seedColors();
    expect(await prisma.color.count()).toBe(4);
  });

  it("rolls the previous test's data back", async () => {
    expect(await prisma.color.count()).toBe(0);

    // Re-seeding the same primary keys would fail if anything leaked.
    await seedAll();
    expect(await prisma.color.count()).toBe(4);
    expect(await prisma.pixel.count()).toBe(8);
  });

  it("exposes $kysely on the transaction-bound client", async () => {
    await seedColors();

    const colors = await prisma.$kysely
      .selectFrom("color")
      .select(["id", "emojiName"])
      .orderBy("id")
      .execute();

    expect(colors).toHaveLength(4);
    expect(colors[0]).toEqual({ id: 1, emojiName: "pl_blank" });
  });

  it("emulates nested $transaction calls with savepoints", async () => {
    await seedColors();

    await expect(
      prisma.$transaction(async (tx) => {
        await (tx as typeof prisma).color.deleteMany();
        throw new Error("test error");
      }),
    ).rejects.toThrow("test error");

    // The savepoint rollback restored the seeded colors.
    expect(await prisma.color.count()).toBe(4);
  });
});
