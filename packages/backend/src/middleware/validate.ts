import type { NextFunction, Request, RequestHandler, Response } from "express";
import type z from "zod";
import { BadRequestError } from "@/errors";

type DefaultParams = Request["params"];
type DefaultQuery = Request["query"];

export type Schemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

type ZodOr<Input, Fallback> =
  Input extends z.ZodType ? z.infer<Input> : Fallback;

export type ValidatedRequest<Schema extends Schemas> = Request<
  ZodOr<Schema["params"], DefaultParams>,
  unknown,
  ZodOr<Schema["body"], unknown>,
  ZodOr<Schema["query"], DefaultQuery>
>;

export type ValidatedHandler<Schema extends Schemas> = (
  req: ValidatedRequest<Schema>,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

/**
 * A {@link RequestHandler} returned by {@link validate}, branded with the
 * schemas it was built from. `__schemas` is an actual runtime property rather
 * than a phantom type field so the brand survives when `validate(...)` is
 * called inline inside a {@link typedRouter} chain; TypeScript widens away
 * phantom-only brands during variadic inference.
 */
export type ValidateMiddleware<Schema extends Schemas> = RequestHandler & {
  readonly __schemas: Schema;
};

/**
 * Parses `req.body`, `req.query`, and `req.params` against the given schemas
 * and writes the parsed values back onto the request. `req.query` has to go
 * through `Object.defineProperty` because Express 5 exposes it as a getter.
 *
 * If `handler` is supplied it runs with a fully-typed `req` once parsing
 * succeeds; otherwise the middleware just calls `next()`. Validation failures
 * throw a {@link BadRequestError}, which Express 5's async router hands off
 * to the global error handler.
 *
 * The returned function is branded with `__schemas` so {@link typedRouter}
 * can recover the schema types from a handler chain and type the trailing
 * handler's `req`.
 */
export function validate<Schema extends Schemas>(
  schemas: Schema,
  handler?: ValidatedHandler<Schema>,
): ValidateMiddleware<Schema> {
  const middleware: RequestHandler = async (req, res, next) => {
    const [bodyResult, queryResult, paramsResult] = await Promise.all([
      schemas.body?.safeParseAsync(req.body),
      schemas.query?.safeParseAsync(req.query),
      schemas.params?.safeParseAsync(req.params),
    ]);

    const issues: z.core.$ZodIssue[] = [];
    if (bodyResult && !bodyResult.success) {
      issues.push(...bodyResult.error.issues);
    }
    if (queryResult && !queryResult.success) {
      issues.push(...queryResult.error.issues);
    }
    if (paramsResult && !paramsResult.success) {
      issues.push(...paramsResult.error.issues);
    }

    if (issues.length > 0) {
      throw new BadRequestError("Invalid request data", issues);
    }

    if (bodyResult) {
      req.body = bodyResult.data;
    }
    if (paramsResult) {
      req.params = paramsResult.data as DefaultParams;
    }
    if (queryResult) {
      Object.defineProperty(req, "query", {
        value: queryResult.data,
        writable: true,
        configurable: true,
      });
    }

    if (handler) {
      return handler(req as ValidatedRequest<Schema>, res, next);
    }
    next();
  };

  return Object.assign(middleware, { __schemas: schemas });
}
