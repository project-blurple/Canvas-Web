import express from "express";
import request from "supertest";
import {
  addUsersToBlacklist,
  getBlacklist,
  removeUsersFromBlacklist,
} from "@/services/blacklistService";
import { mockAuth } from "@/test/mockAuth";

vi.mock("@/services/blacklistService", () => ({
  addUsersToBlacklist: vi.fn(),
  getBlacklist: vi.fn(),
  removeUsersFromBlacklist: vi.fn(),
}));

import { blacklistRouter } from "./blacklist";

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
  app.use("/api/v1/blacklist", blacklistRouter);
  return app;
};

describe("Blacklist route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the blacklist for a moderator", async () => {
    const blacklist = [
      {
        user_id: 9n,
        date_added: new Date(0),
      },
    ];
    vi.mocked(getBlacklist).mockResolvedValueOnce(blacklist as never);

    const app = createApp({ authenticated: true, moderator: true });
    const response = await request(app)
      .get("/api/v1/blacklist")
      .set("X-TestUserId", "1")
      .expect(200);

    expect(response.body).toStrictEqual([
      {
        user_id: "9",
        date_added: new Date(0).toISOString(),
      },
    ]);
    expect(getBlacklist).toHaveBeenCalledTimes(1);
  });

  it("adds users to the blacklist for a moderator", async () => {
    const app = createApp({ authenticated: true, moderator: true });
    vi.mocked(addUsersToBlacklist).mockResolvedValueOnce(undefined);

    const response = await request(app)
      .post("/api/v1/blacklist")
      .set("X-TestUserId", "1")
      .send({
        userId: ["1", "2"],
      })
      .type("json")
      .expect(200);

    expect(response.body).toStrictEqual({
      message: "Users added to blacklist",
    });
    expect(addUsersToBlacklist).toHaveBeenCalledTimes(1);
    expect(addUsersToBlacklist).toHaveBeenCalledWith([1n, 2n]);
  });

  it("removes users from the blacklist for a moderator", async () => {
    const app = createApp({ authenticated: true, moderator: true });
    vi.mocked(removeUsersFromBlacklist).mockResolvedValueOnce(undefined);

    const response = await request(app)
      .delete("/api/v1/blacklist")
      .set("X-TestUserId", "1")
      .send({
        userId: "9",
      })
      .type("json")
      .expect(204);

    expect(response.body).toStrictEqual({});
    expect(removeUsersFromBlacklist).toHaveBeenCalledTimes(1);
    expect(removeUsersFromBlacklist).toHaveBeenCalledWith([9n]);
  });

  it("returns 401 when blacklist access is unauthenticated", async () => {
    const app = createApp();

    const response = await request(app).get("/api/v1/blacklist");

    expect(response.status).toBe(401);
    expect(response.body).toStrictEqual({ message: "Unauthorized" });
    expect(getBlacklist).not.toHaveBeenCalled();
  });

  it("returns 403 when blacklist mutation permissions are missing", async () => {
    const app = createApp({ authenticated: true, moderator: false });

    const response = await request(app)
      .post("/api/v1/blacklist")
      .set("X-TestUserId", "1")
      .send({
        userId: "1",
      })
      .type("json");

    expect(response.status).toBe(403);
    expect(response.body).toStrictEqual({
      message: "You do not have permission to perform this action",
    });
    expect(addUsersToBlacklist).not.toHaveBeenCalled();
  });
});
