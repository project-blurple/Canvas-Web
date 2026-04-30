import { prisma } from "@/client";
import { seedBlacklist, seedUsers } from "@/test";
import {
  addUsersToBlocklist,
  getBlocklist,
  removeUsersFromBlocklist,
  userIsBlocklisted,
} from "./blocklistService";

describe("blocklistService", () => {
  beforeEach(async () => {
    await seedUsers();
    await seedBlacklist();
  });

  describe("getBlocklist", () => {
    it("returns the blocklist entries", async () => {
      await expect(getBlocklist()).resolves.toStrictEqual([
        {
          user_id: 9n,
          date_added: new Date(0),
        },
      ]);
    });
  });

  describe("userIsBlocklisted", () => {
    it("returns true for a blocked user", async () => {
      await expect(userIsBlocklisted(9n)).resolves.toBe(true);
    });

    it("returns false for an unblocked user", async () => {
      await expect(userIsBlocklisted(1n)).resolves.toBe(false);
    });
  });

  describe("addUsersToBlocklist", () => {
    it("adds users from any iterable", async () => {
      await expect(addUsersToBlocklist(new Set([1n]))).resolves.toStrictEqual([
        {
          user_id: 1n,
          date_added: expect.any(Date),
        },
      ]);

      await expect(userIsBlocklisted(1n)).resolves.toBe(true);
    });
  });

  describe("removeUsersFromBlocklist", () => {
    it("removes users from the blocklist", async () => {
      await prisma.blacklist.create({
        data: {
          user_id: 1n,
        },
      });

      await removeUsersFromBlocklist(new Set([1n]));

      await expect(userIsBlocklisted(1n)).resolves.toBe(false);
    });
  });
});
