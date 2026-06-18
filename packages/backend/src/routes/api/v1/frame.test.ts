import express from "express";
import request from "supertest";
import { ForbiddenError, UnprocessableError } from "@/errors";
import { errorHandler } from "@/middleware/errorHandler";
import {
  assertMaxOwnerFramesNotExceeded,
  createFrame,
  deleteFrame,
  editFrame,
} from "@/services/frameService";
import { mockAuth } from "@/test/mockAuth";
import { frameRouter } from "./frame";

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

vi.mock("@/services/canvasService", () => ({
  getCanvasInfo: vi.fn(),
}));

vi.mock("@/services/discordGuildService", () => ({
  isCanvasModerator: vi.fn(),
  isCanvasAdmin: vi.fn(),
}));

vi.mock("@/services/exportService", () => ({
  exportFrameAsStream: vi.fn(),
}));

vi.mock("@/services/timelapse/timelapseService", () => ({
  generateTimelapse: vi.fn(),
}));

const TEST_USER_SNOWFLAKE = "123456789012345678";

const endpointCases = [
  {
    name: "create",
    method: "post",
    path: "/api/v1/frame",
    body: {
      canvasId: 1,
      name: "Frame name",
      owner: { type: "user", id: TEST_USER_SNOWFLAKE },
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
  app.use(errorHandler);
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

const getRateLimitHeaders = (userId: string = "1", ipSuffix: string = "1") => ({
  "Test-User-Id": userId,
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
      }).set("Test-User-Id", "1");

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
        owner: { type: "user", id: TEST_USER_SNOWFLAKE },
        x0: 0,
        y0: 0,
        x1: 10,
        y1: 10,
      },
    }).set("Test-User-Id", "1");

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
      expect(response.body).toStrictEqual({
        message: "User is not authenticated",
      });
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
      }).set("Test-User-Id", "1");

      expect(response.status).toBe(403);
      expect(response.body).toStrictEqual({ message: "Forbidden" });
      expect(serviceMock).toHaveBeenCalledTimes(1);
    },
  );

  it("returns 400 when the owner type is system", async () => {
    const app = createApp(true);
    const response = await sendMutationRequest("/api/v1/frame", {
      app,
      method: "post",
      body: {
        canvasId: 1,
        name: "Frame name",
        owner: { type: "system", id: TEST_USER_SNOWFLAKE },
        x0: 0,
        y0: 0,
        x1: 10,
        y1: 10,
      },
    }).set(getRateLimitHeaders("1", "30"));
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      errors: [
        {
          code: "custom",
          path: ["owner", "type"],
          message: "System-owned frames are not allowed",
        },
      ],
      message: "Invalid request data",
    });
  });

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

        const userId =
          serviceName === "create" ? "10"
          : serviceName === "edit" ? "11"
          : "12";

        for (let index = 0; index < FRAME_MUTATION_LIMIT; index++) {
          const response = await sendMutationRequest(path, {
            app,
            method,
            body,
          }).set(getRateLimitHeaders(userId));
          expect(response.status).toBe(successStatus);
        }

        const blockedResponse = await sendMutationRequest(path, {
          app,
          method,
          body,
        }).set(getRateLimitHeaders(userId));

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
        owner: { type: "user", id: TEST_USER_SNOWFLAKE },
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
        }).set(getRateLimitHeaders("20"));
        expect(response.status).toBe(201);
      }

      const blockedResponse = await sendMutationRequest("/api/v1/frame", {
        app,
        method: "post",
        body: requestBody,
      }).set(getRateLimitHeaders("20"));
      expect(blockedResponse.status).toBe(429);

      vi.advanceTimersByTime(60_001);

      const allowedResponse = await sendMutationRequest("/api/v1/frame", {
        app,
        method: "post",
        body: requestBody,
      }).set(getRateLimitHeaders("20"));

      expect(allowedResponse.status).toBe(201);
      expect(createFrame).toHaveBeenCalledTimes(FRAME_MUTATION_LIMIT + 1);
    });
  });
});
