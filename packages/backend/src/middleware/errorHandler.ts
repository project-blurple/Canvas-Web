import type { ErrorRequestHandler } from "express";
import { ApiError } from "@/errors";

/**
 * If the response has already started (e.g. mid-stream), defer to Express's
 * default error handler so the connection is closed cleanly.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  ApiError.sendError(res, error);
};
