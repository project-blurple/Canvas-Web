import type { ArgumentsHost } from "@nestjs/common";
import { HttpException, Logger } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Response } from "express";
import { ZodSerializationException } from "nestjs-zod";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { z } from "zod";
import { ApiExceptionFilter } from "./api-exception.filter";
import { BadRequestError } from "./errors/bad-request.error";
import { NotFoundError } from "./errors/not-found.error";

type MockResponse = Response & {
  headersSent: boolean;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

describe("ApiExceptionFilter", () => {
  let moduleRef: TestingModule;
  let filter: ApiExceptionFilter;
  let response: MockResponse;
  let host: ArgumentsHost;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [ApiExceptionFilter],
    }).compile();
    filter = moduleRef.get(ApiExceptionFilter);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    response = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    } as unknown as MockResponse;
    host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as ArgumentsHost;
  });

  it("renders an ApiError via its response-body mapping", () => {
    filter.catch(new NotFoundError("not here"), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "not here" });
  });

  it("includes Zod issues from BadRequestError in the response body", () => {
    filter.catch(
      new BadRequestError("Invalid request data", [
        { code: "custom", path: ["name"], message: "required" },
      ]),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: "Invalid request data",
      errors: [{ code: "custom", path: ["name"], message: "required" }],
    });
  });

  it("always includes the errors array for BadRequestError, even when empty", () => {
    filter.catch(new BadRequestError("Invalid request data"), host);

    expect(response.json).toHaveBeenCalledWith({
      message: "Invalid request data",
      errors: [],
    });
  });

  it("falls back to a generic 500 for unknown errors", () => {
    const loggerErrorSpy = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});

    filter.catch(new Error("boom"), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "An unexpected error occurred",
    });
    expect(loggerErrorSpy).toHaveBeenCalled();
    loggerErrorSpy.mockRestore();
  });

  it("closes the connection when headers have already been sent", () => {
    response.headersSent = true;

    filter.catch(new NotFoundError("not here"), host);

    expect(response.destroy).toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });

  it("maps framework HttpExceptions onto the parity envelope", () => {
    filter.catch(new HttpException("Cannot GET /nope", 404), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Cannot GET /nope" });
  });

  it("logs the ZodError and returns the parity 500 for serialization failures", () => {
    const loggerErrorSpy = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});
    const parsed = z.object({ id: z.number() }).safeParse({ id: "nope" });
    if (parsed.success) {
      throw new Error("expected parse failure");
    }

    filter.catch(new ZodSerializationException(parsed.error), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "An unexpected error occurred",
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith(parsed.error);
    loggerErrorSpy.mockRestore();
  });
});
