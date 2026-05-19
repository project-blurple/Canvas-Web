import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, NotFoundError } from "@/errors";
import { errorHandler } from "./errorHandler";

describe("errorHandler", () => {
  let req: Request;
  let res: Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as typeof res;
    next = vi.fn();
  });

  it("renders an ApiError via its applyToResponse mapping", () => {
    const error = new NotFoundError("not here");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "not here" });
    expect(next).not.toHaveBeenCalled();
  });

  it("includes Zod issues from BadRequestError in the response body", () => {
    const error = new BadRequestError("Invalid request data", [
      { code: "custom", path: ["name"], message: "required" },
    ]);

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid request data",
      errors: [{ code: "custom", path: ["name"], message: "required" }],
    });
  });

  it("falls back to a generic 500 for unknown errors", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const error = new Error("boom");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "An unexpected error occurred",
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("defers to the default handler when headers have already been sent", () => {
    res.headersSent = true;
    const error = new NotFoundError("not here");

    errorHandler(error, req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
