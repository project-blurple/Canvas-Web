import { Controller, Get, Logger } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { BadRequestError } from "../src/common/errors/bad-request.error";
import { ConflictError } from "../src/common/errors/conflict.error";
import { ForbiddenError } from "../src/common/errors/forbidden.error";
import { NotAcceptableError } from "../src/common/errors/not-acceptable.error";
import { NotFoundError } from "../src/common/errors/not-found.error";
import { TooManyRequestsError } from "../src/common/errors/too-many-requests.error";
import { UnauthorizedError } from "../src/common/errors/unauthorized.error";
import { UnprocessableError } from "../src/common/errors/unprocessable.error";

@Controller()
class TestController {
  @Get("bad-request")
  badRequest(): never {
    throw new BadRequestError("Invalid request data", [
      { code: "custom", path: ["name"], message: "required" },
    ]);
  }

  @Get("unauthorized")
  unauthorized(): never {
    throw new UnauthorizedError("You must be logged in");
  }

  @Get("forbidden")
  forbidden(): never {
    throw new ForbiddenError("You are not a canvas moderator");
  }

  @Get("not-found")
  notFound(): never {
    throw new NotFoundError("Canvas not found");
  }

  @Get("not-acceptable")
  notAcceptable(): never {
    throw new NotAcceptableError("Unsupported image format");
  }

  @Get("conflict")
  conflict(): never {
    throw new ConflictError("Pixel was placed concurrently");
  }

  @Get("unprocessable")
  unprocessable(): never {
    throw new UnprocessableError("Color is not in the event palette");
  }

  @Get("too-many-requests")
  tooManyRequests(): never {
    throw new TooManyRequestsError("Too many requests");
  }

  @Get("unexpected")
  unexpected(): never {
    throw new Error("boom");
  }
}

describe("Error contract (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestController],
    }).compile();

    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    [
      "bad-request",
      400,
      {
        message: "Invalid request data",
        errors: [{ code: "custom", path: ["name"], message: "required" }],
      },
    ],
    ["unauthorized", 401, { message: "You must be logged in" }],
    ["forbidden", 403, { message: "You are not a canvas moderator" }],
    ["not-found", 404, { message: "Canvas not found" }],
    [
      "not-acceptable",
      406,
      { message: "Unsupported image format", errors: [] },
    ],
    ["conflict", 409, { message: "Pixel was placed concurrently" }],
    ["unprocessable", 422, { message: "Color is not in the event palette" }],
    ["too-many-requests", 429, { message: "Too many requests" }],
  ] as const)(
    "renders %s with its ApiError envelope",
    async (route, status, body) => {
      const response = await request(app.getHttpServer()).get(`/${route}`);

      expect(response.status).toBe(status);
      expect(response.body).toStrictEqual(body);
    },
  );

  it.todo("returns 503 when the database is unavailable");

  it("returns an opaque 500 for unexpected errors and logs them", async () => {
    // The filter logs through a Logger instance, so spy on the prototype —
    // instance calls never reach the static Logger.error.
    const loggerErrorSpy = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});

    const response = await request(app.getHttpServer()).get("/unexpected");

    expect(response.status).toBe(500);
    expect(response.body).toStrictEqual({
      message: "An unexpected error occurred",
    });
    expect(loggerErrorSpy).toHaveBeenCalled();
    loggerErrorSpy.mockRestore();
  });

  it("maps framework 404s for unknown routes onto the envelope", async () => {
    const response = await request(app.getHttpServer()).get("/nope");

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({ message: "Cannot GET /nope" });
  });
});
