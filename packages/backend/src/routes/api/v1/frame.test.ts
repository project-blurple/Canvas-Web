import express from "express";
import request from "supertest";

import { ForbiddenError, UnprocessableError } from "@/errors";
import {
  assertMaxOwnerFramesNotExceeded,
  createFrame,
  deleteFrame,
  editFrame,
} from "@/services/frameService";
import {
  assignColorToEvent,
  createColor,
  deleteColor,
  editColor,
  unassignColorFromEvent,
} from "@/services/paletteService";
import { mockAuth } from "@/test/mockAuth";
import { frameRouter } from "./frame";
import { paletteRouter } from "./palette";

interface EndpointCase {
  name: string;
  method: "post" | "put" | "delete";
  path: string;
  body: Record<string, unknown>;
  successStatus: number;
  successBody: unknown;
  serviceName: "create" | "edit" | "delete";
}

vi.mock("@/services/frameService", () => ({
  assertMaxOwnerFramesNotExceeded: vi.fn(),
  createFrame: vi.fn(),
  deleteFrame: vi.fn(),
  editFrame: vi.fn(),
  getFrameById: vi.fn(),
  getFramesByGuildIds: vi.fn(),
  getFramesByUserId: vi.fn(),
}));

vi.mock("@/services/paletteService", () => ({
  assignColorToEvent: vi.fn(),
  createColor: vi.fn(),
  deleteColor: vi.fn(),
  editColor: vi.fn(),
  getCurrentEventPalette: vi.fn(),
  getEventPalette: vi.fn(),
  unassignColorFromEvent: vi.fn(),
}));

const endpointCases = [
  {
    name: "create",
    method: "post",
    path: "/api/v1/frame",
    body: {
      canvasId: 1,
      name: "Frame name",
      ownerId: "1",
      isGuildOwned: false,
      x0: 0,
      y0: 0,
      x1: 10,
      y1: 10,
    },
    successStatus: 201,
    successBody: "",
    serviceName: "create",
  },
  {
    name: "edit",
    method: "put",
    path: "/api/v1/frame/abc123/edit",
    body: {
      name: "Updated frame",
      x0: 1,
      y0: 2,
      x1: 11,
      y1: 12,
    },
    successStatus: 200,
    successBody: { id: "abc123" },
    serviceName: "edit",
  },
  {
    name: "delete",
    method: "delete",
    path: "/api/v1/frame/abc123/delete",
    body: {},
    successStatus: 204,
    successBody: {},
    serviceName: "delete",
  },
] as const satisfies readonly EndpointCase[];

const getServiceMock = (serviceName: EndpointCase["serviceName"]) => {
  switch (serviceName) {
    case "create":
      return vi.mocked(createFrame);
    case "edit":
      return vi.mocked(editFrame);
    case "delete":
      return vi.mocked(deleteFrame);
  }
};

const createApp = (includeAccessToken: boolean) => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(mockAuth);
  app.use((req, _res, next) => {
    req.session = {} as typeof req.session;
    if (includeAccessToken) {
      req.session.discordAccessToken = "test-access-token";
    }
    next();
  });
  app.use("/api/v1/frame", frameRouter);
  return app;
};

const sendMutationRequest = (
  path: string,
  {
    app,
    method,
    body,
  }: {
    app: express.Express;
    method: EndpointCase["method"];
    body: Record<string, unknown>;
  },
) => request(app)[method](path).send(body).type("json");

const FRAME_MUTATION_LIMIT = 10;

const getRateLimitHeaders = (ipSuffix: string) => ({
  "X-TestUserId": "1",
  "X-Forwarded-For": `203.0.113.${ipSuffix}`,
});

describe("Frame mutation route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(endpointCases)(
    "returns success for $name when authenticated and authorized",
    async ({ method, path, body, successStatus, successBody, serviceName }) => {
      const app = createApp(true);
      const serviceMock = getServiceMock(serviceName);
      switch (serviceName) {
        case "create":
          vi.mocked(assertMaxOwnerFramesNotExceeded).mockResolvedValueOnce(
            undefined,
          );
          vi.mocked(createFrame).mockResolvedValueOnce(undefined);
          break;
        case "edit":
          vi.mocked(editFrame).mockResolvedValueOnce({
            id: "abc123",
          } as Awaited<ReturnType<typeof editFrame>>);
          break;
        case "delete":
          vi.mocked(deleteFrame).mockResolvedValueOnce(undefined);
          break;
      }

      const response = await sendMutationRequest(path, {
        app,
        method,
        body,
      }).set("X-TestUserId", "1");

      expect(response.status).toBe(successStatus);
      expect(response.body).toStrictEqual(successBody);
      expect(serviceMock).toHaveBeenCalledTimes(1);
    },
  );

  it("returns 422 when the create frame limit is exceeded", async () => {
    const app = createApp(true);
    vi.mocked(assertMaxOwnerFramesNotExceeded).mockRejectedValueOnce(
      new UnprocessableError("Frame limit reached"),
    );

    const response = await sendMutationRequest("/api/v1/frame", {
      app,
      method: "post",
      body: {
        canvasId: 1,
        name: "Frame name",
        ownerId: "1",
        isGuildOwned: false,
        x0: 0,
        y0: 0,
        x1: 10,
        y1: 10,
      },
    }).set("X-TestUserId", "1");

    expect(response.status).toBe(422);
    expect(response.body).toStrictEqual({ message: "Frame limit reached" });
    expect(assertMaxOwnerFramesNotExceeded).toHaveBeenCalledTimes(1);
    expect(createFrame).not.toHaveBeenCalled();
  });

  it.each(endpointCases)(
    "returns 401 for $name when authentication is missing",
    async ({ method, path, body, serviceName }) => {
      const app = createApp(false);
      const serviceMock = getServiceMock(serviceName);

      const response = await sendMutationRequest(path, {
        app,
        method,
        body,
      });

      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({ message: "Unauthorized" });
      expect(serviceMock).not.toHaveBeenCalled();
    },
  );

  it.each(endpointCases)(
    "returns 403 for $name when permissions are denied",
    async ({ method, path, body, serviceName }) => {
      const app = createApp(true);
      const serviceMock = getServiceMock(serviceName);
      serviceMock.mockRejectedValueOnce(new ForbiddenError("Forbidden"));

      const response = await sendMutationRequest(path, {
        app,
        method,
        body,
      }).set("X-TestUserId", "1");

      expect(response.status).toBe(403);
      expect(response.body).toStrictEqual({ message: "Forbidden" });
      expect(serviceMock).toHaveBeenCalledTimes(1);
    },
  );

  describe("rate limit", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each(endpointCases)(
      "returns 429 for $name after exceeding limiter threshold",
      async ({ method, path, body, successStatus, serviceName }) => {
        const app = createApp(true);
        const serviceMock = getServiceMock(serviceName);

        switch (serviceName) {
          case "create":
            vi.mocked(createFrame).mockResolvedValue(undefined);
            break;
          case "edit":
            vi.mocked(editFrame).mockResolvedValue({
              id: "abc123",
            } as Awaited<ReturnType<typeof editFrame>>);
            break;
          case "delete":
            vi.mocked(deleteFrame).mockResolvedValue(undefined);
            break;
        }

        const ipSuffix =
          serviceName === "create" ? "11"
          : serviceName === "edit" ? "12"
          : "13";

        for (let index = 0; index < FRAME_MUTATION_LIMIT; index++) {
          const response = await sendMutationRequest(path, {
            app,
            method,
            body,
          }).set(getRateLimitHeaders(ipSuffix));
          expect(response.status).toBe(successStatus);
        }

        const blockedResponse = await sendMutationRequest(path, {
          app,
          method,
          body,
        }).set(getRateLimitHeaders(ipSuffix));

        expect(blockedResponse.status).toBe(429);
        expect(blockedResponse.text).toContain("You have been rate limited");
        expect(serviceMock).toHaveBeenCalledTimes(FRAME_MUTATION_LIMIT);
      },
    );

    it("allows create requests again after the limiter window resets", async () => {
      const app = createApp(true);
      vi.mocked(createFrame).mockResolvedValue(undefined);
      const requestBody = {
        canvasId: 1,
        name: "Frame name",
        ownerId: "1",
        isGuildOwned: false,
        x0: 0,
        y0: 0,
        x1: 10,
        y1: 10,
      };

      for (let index = 0; index < FRAME_MUTATION_LIMIT; index++) {
        const response = await sendMutationRequest("/api/v1/frame", {
          app,
          method: "post",
          body: requestBody,
        }).set(getRateLimitHeaders("21"));
        expect(response.status).toBe(201);
      }

      const blockedResponse = await sendMutationRequest("/api/v1/frame", {
        app,
        method: "post",
        body: requestBody,
      }).set(getRateLimitHeaders("21"));
      expect(blockedResponse.status).toBe(429);

      vi.advanceTimersByTime(60_001);

      const allowedResponse = await sendMutationRequest("/api/v1/frame", {
        app,
        method: "post",
        body: requestBody,
      }).set(getRateLimitHeaders("21"));

      expect(allowedResponse.status).toBe(201);
      expect(createFrame).toHaveBeenCalledTimes(FRAME_MUTATION_LIMIT + 1);
    });
  });
});

const createPaletteApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { isCanvasAdmin: true } as Express.User;
    req.session = {
      discordAccessToken: "test-access-token",
    } as typeof req.session;
    next();
  });
  app.use("/api/v1/palette", paletteRouter);
  return app;
};

describe("Palette admin route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a color", async () => {
    const app = createPaletteApp();
    vi.mocked(createColor).mockResolvedValueOnce({
      id: 1,
      code: "pink",
      name: "Pink",
      global: true,
      rgba: [255, 0, 255, 255],
      emoji_name: null,
      emoji_id: null,
    } as Awaited<ReturnType<typeof createColor>>);

    const response = await request(app)
      .post("/api/v1/palette/")
      .send({
        code: "pink",
        name: "Pink",
        global: true,
        rgba: [255, 0, 255, 255],
      });

    expect(response.status).toBe(201);
    expect(response.body).toStrictEqual({
      message: "Color created",
    });
    expect(vi.mocked(createColor)).toHaveBeenCalledWith({
      code: "pink",
      name: "Pink",
      global: true,
      rgba: [255, 0, 255, 255],
    });
  });

  it("edits a color", async () => {
    const app = createPaletteApp();
    vi.mocked(editColor).mockResolvedValueOnce({
      id: 3,
      code: "gren",
      name: "Green",
      global: false,
      rgba: [0, 255, 0, 255],
      emoji_name: null,
      emoji_id: null,
    } as Awaited<ReturnType<typeof editColor>>);

    const response = await request(app)
      .put("/api/v1/palette/3")
      .send({
        code: "gren",
        name: "Green",
        global: false,
        rgba: [0, 255, 0, 255],
      });

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      message: "Color edited",
    });
    expect(vi.mocked(editColor)).toHaveBeenCalledWith({
      colorId: 3,
      data: {
        code: "gren",
        name: "Green",
        global: false,
        rgba: [0, 255, 0, 255],
      },
    });
  });

  it("deletes a color", async () => {
    const app = createPaletteApp();
    vi.mocked(deleteColor).mockResolvedValueOnce(undefined);

    const response = await request(app).delete("/api/v1/palette/5");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      message: "Color deleted",
    });
    expect(vi.mocked(deleteColor)).toHaveBeenCalledWith(5);
  });

  it("assigns a color to an event", async () => {
    const app = createPaletteApp();
    vi.mocked(assignColorToEvent).mockResolvedValueOnce(undefined);

    const response = await request(app).post(
      "/api/v1/palette/8/assign/13/123456789012345678",
    );

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      message: "Color assigned to event",
    });
    expect(vi.mocked(assignColorToEvent)).toHaveBeenCalledWith({
      colorId: 8,
      eventId: 13,
      guildId: 123456789012345678n,
    });
  });

  it("unassigns a color from an event", async () => {
    const app = createPaletteApp();
    vi.mocked(unassignColorFromEvent).mockResolvedValueOnce(undefined);

    const response = await request(app).delete(
      "/api/v1/palette/8/assign/13/123456789012345678",
    );

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      message: "Color unassigned from event",
    });
    expect(vi.mocked(unassignColorFromEvent)).toHaveBeenCalledWith({
      eventId: 13,
      guildId: 123456789012345678n,
    });
  });
});
