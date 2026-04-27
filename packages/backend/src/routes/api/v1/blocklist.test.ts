import express, { type RequestHandler } from "express";
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

  const setTestRequestState: RequestHandler = (req, _res, next) => {
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
  };

  app.use(setTestRequestState);
  app.use("/api/v1/blocklist", blocklistRouter);
  return app;
};

describe("Blocklist route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the blocklist for a moderator", async () => {
    const dateAdded = new Date();
    const blocklist = [
      {
        user_id: 9n,
        date_added: dateAdded,
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
        date_added: dateAdded.toISOString(),
      },
    ]);
    expect(getBlocklist).toHaveBeenCalledTimes(1);
  });

  it("adds users to the blocklist for a moderator", async () => {
    const app = createApp({ authenticated: true, moderator: true });
    const dateAdded = new Date();
    vi.mocked(addUsersToBlocklist).mockResolvedValueOnce([
      {
        user_id: 1n,
        date_added: dateAdded,
      },
      {
        user_id: 2n,
        date_added: dateAdded,
      },
    ] as never);

    const response = await request(app)
      .post("/api/v1/blocklist")
      .set("X-TestUserId", "1")
      .send({
        userId: ["1", "2"],
      })
      .type("json")
      .expect(201);

    expect(response.body).toStrictEqual([
      {
        user_id: "1",
        date_added: dateAdded.toISOString(),
      },
      {
        user_id: "2",
        date_added: dateAdded.toISOString(),
      },
    ]);
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
