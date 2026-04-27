import express from "express";
import request from "supertest";
import {
  addUsersToBlocklist,
  getBlocklist,
  removeUsersFromBlocklist,
} from "@/services/blocklistService";
import { mockAuth } from "@/test/mockAuth";

vi.mock("@/services/blocklistService", () => ({
  addUsersToBlocklist: vi.fn(),
  getBlocklist: vi.fn(),
  removeUsersFromBlocklist: vi.fn(),
}));

import { blocklistRouter } from "./blocklist";

const createApp = ({ authenticated = false, moderator = false } = {}) => {
  const app = express();
  app.use(express.json());
  app.use(mockAuth);
  app.use((req, _res, next) => {
    req.session = {} as typeof req.session;
    if (authenticated) {
      req.session.discordAccessToken = "test-access-token";
    }
    if (moderator && req.user) {
      req.user = {
        ...req.user,
        isCanvasModerator: true,
      };
    }
    next();
  });
  app.use("/api/v1/blocklist", blocklistRouter);
  return app;
};

describe("Blocklist route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the blocklist for a moderator", async () => {
    const blocklist = [
      {
        user_id: 9n,
        date_added: new Date(0),
      },
    ];
    vi.mocked(getBlocklist).mockResolvedValueOnce(blocklist as never);

    const app = createApp({ authenticated: true, moderator: true });
    const response = await request(app)
      .get("/api/v1/blocklist")
      .set("X-TestUserId", "1")
      .expect(200);

    expect(response.body).toStrictEqual([
      {
        user_id: "9",
        date_added: new Date(0).toISOString(),
      },
    ]);
    expect(getBlocklist).toHaveBeenCalledTimes(1);
  });

  it("adds users to the blocklist for a moderator", async () => {
    const app = createApp({ authenticated: true, moderator: true });
    vi.mocked(addUsersToBlocklist).mockResolvedValueOnce(undefined);

    const response = await request(app)
      .post("/api/v1/blocklist")
      .set("X-TestUserId", "1")
      .send({
        userId: ["1", "2"],
      })
      .type("json")
      .expect(200);

    expect(response.body).toStrictEqual({
      message: "Users added to blocklist",
    });
    expect(addUsersToBlocklist).toHaveBeenCalledTimes(1);
    expect(addUsersToBlocklist).toHaveBeenCalledWith([1n, 2n]);
  });

  it("removes users from the blocklist for a moderator", async () => {
    const app = createApp({ authenticated: true, moderator: true });
    vi.mocked(removeUsersFromBlocklist).mockResolvedValueOnce(undefined);

    const response = await request(app)
      .delete("/api/v1/blocklist")
      .set("X-TestUserId", "1")
      .send({
        userId: "9",
      })
      .type("json")
      .expect(204);

    expect(response.body).toStrictEqual({});
    expect(removeUsersFromBlocklist).toHaveBeenCalledTimes(1);
    expect(removeUsersFromBlocklist).toHaveBeenCalledWith([9n]);
  });

  it("returns 401 when blocklist access is unauthenticated", async () => {
    const app = createApp();

    const response = await request(app).get("/api/v1/blocklist");

    expect(response.status).toBe(401);
    expect(response.body).toStrictEqual({ message: "Unauthorized" });
    expect(getBlocklist).not.toHaveBeenCalled();
  });

  it("returns 403 when blocklist mutation permissions are missing", async () => {
    const app = createApp({ authenticated: true, moderator: false });

    const response = await request(app)
      .post("/api/v1/blocklist")
      .set("X-TestUserId", "1")
      .send({
        userId: "1",
      })
      .type("json");

    expect(response.status).toBe(403);
    expect(response.body).toStrictEqual({
      message: "You do not have permission to perform this action",
    });
    expect(addUsersToBlocklist).not.toHaveBeenCalled();
  });
});
