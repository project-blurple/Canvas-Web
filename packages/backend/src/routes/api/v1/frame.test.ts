import express from "express";
import request from "supertest";

import { ForbiddenError } from "@/errors";
import { createFrame, deleteFrame, editFrame } from "@/services/frameService";
import { mockAuth } from "@/test/mockAuth";
import { frameRouter } from "./frame";

interface EndpointCase {
  name: string;
  method: "post" | "put" | "delete";
  path: string;
  body: Record<string, unknown>;
  successStatus: number;
  successMessage: string;
  serviceName: "create" | "edit" | "delete";
}

vi.mock("@/services/frameService", () => ({
  createFrame: vi.fn(),
  deleteFrame: vi.fn(),
  editFrame: vi.fn(),
  getFrameById: vi.fn(),
  getFramesByGuildIds: vi.fn(),
  getFramesByUserId: vi.fn(),
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
    successMessage: "Frame created successfully",
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
    successMessage: "Frame edited successfully",
    serviceName: "edit",
  },
  {
    name: "delete",
    method: "delete",
    path: "/api/v1/frame/abc123/delete",
    body: {},
    successStatus: 200,
    successMessage: "Frame deleted successfully",
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

const sendMutationRequest = ({
  app,
  method,
  path,
  body,
}: {
  app: express.Express;
  method: EndpointCase["method"];
  path: string;
  body: Record<string, unknown>;
}) => request(app)[method](path).send(body).type("json");

describe("Frame mutation route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(endpointCases)(
    "returns success for $name when authenticated and authorized",
    async ({
      method,
      path,
      body,
      successStatus,
      successMessage,
      serviceName,
    }) => {
      const app = createApp(true);
      const serviceMock = getServiceMock(serviceName);
      serviceMock.mockResolvedValueOnce(undefined);

      const response = await sendMutationRequest({
        app,
        method,
        path,
        body,
      }).set("X-TestUserId", "1");

      expect(response.status).toBe(successStatus);
      expect(response.body).toStrictEqual({ message: successMessage });
      expect(serviceMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each(endpointCases)(
    "returns 401 for $name when authentication is missing",
    async ({ method, path, body, serviceName }) => {
      const app = createApp(false);
      const serviceMock = getServiceMock(serviceName);

      const response = await sendMutationRequest({
        app,
        method,
        path,
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

      const response = await sendMutationRequest({
        app,
        method,
        path,
        body,
      }).set("X-TestUserId", "1");

      expect(response.status).toBe(403);
      expect(response.body).toStrictEqual({ message: "Forbidden" });
      expect(serviceMock).toHaveBeenCalledTimes(1);
    },
  );
});
