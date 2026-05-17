import type { IRoute, RequestHandler, Router } from "express";
import type { Schemas, ValidatedHandler, ValidateMiddleware } from "./validate";

/**
 * HTTP methods we type. Anything not listed here stays on the typed router
 * with its original Express signature.
 */
type HttpMethod =
  | "all"
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head";

/**
 * The schemas of the first {@link ValidateMiddleware} in a handler chain, or
 * {@link Schemas} itself when there isn't one. Falling back to {@link Schemas}
 * is what keeps `req.body`, `req.query`, and `req.params` typed
 * as their Express defaults instead of collapsing to `never`
 * for chains without `validate(...)`.
 */
type ExtractValidateSchemas<Middlewares extends readonly unknown[]> =
  Middlewares extends readonly [infer Head, ...infer Rest] ?
    Head extends ValidateMiddleware<infer Schema> ?
      Schema
    : ExtractValidateSchemas<Rest>
  : Schemas;

/**
 * Any number of middlewares followed by a handler whose `req` is typed from
 * whatever {@link ValidateMiddleware} sits in the chain. `const Middlewares`
 * keeps the literal tuple so the brand survives inference.
 */
type HandlerChain<Middlewares extends readonly unknown[]> = readonly [
  ...Middlewares,
  ValidatedHandler<ExtractValidateSchemas<Middlewares>>,
];

type RouterMethod<Method extends HttpMethod> = <
  const Middlewares extends readonly unknown[],
>(
  path: Parameters<Router[Method]>[0],
  ...handlers: HandlerChain<Middlewares>
) => TypedRouter;
type RouteMethod = <const Middlewares extends readonly unknown[]>(
  ...handlers: HandlerChain<Middlewares>
) => TypedRoute;

/**
 * Express's {@link IRoute} with the HTTP methods replaced by typed
 * versions. Returned by {@link TypedRouter.route} so chained calls like
 * `route.get(...).post(...)` keep the validation inference.
 */
export type TypedRoute = Omit<IRoute, HttpMethod> & {
  [Method in HttpMethod]: RouteMethod;
};

/**
 * Express's {@link Router} with the HTTP methods and `route(...)`
 * replaced by typed versions. Everything else is preserved.
 */
export type TypedRouter = RequestHandler &
  Omit<Router, HttpMethod | "route"> & {
    [Method in HttpMethod]: RouterMethod<Method>;
  } & {
    route(prefix: Parameters<Router["route"]>[0]): TypedRoute;
  };

/**
 * Re-types an Express {@link Router} so the HTTP methods (and the
 * methods on `router.route(...)`) pick up the schemas of any
 * {@link ValidateMiddleware} in the handler chain and use them to type the
 * trailing handler's `req`.
 *
 * ```ts
 * export const historyRouter = typedRouter(Router({ mergeParams: true }));
 *
 * historyRouter.use(requireCanvasModerator);
 *
 * historyRouter.post(
 *   "/",
 *   validate({ params, query, body }),
 *   async (req, res) => {
 *     // req.params, req.query, req.body are inferred from the schemas above
 *   },
 * );
 *
 * historyRouter
 *   .route("/:id")
 *   .get(validate({ params }), async (req, res) => {  })
 *   .delete(async (_req, res) => res.status(204).send());
 * ```
 */
export function typedRouter(router: Router): TypedRouter {
  return router as unknown as TypedRouter;
}
