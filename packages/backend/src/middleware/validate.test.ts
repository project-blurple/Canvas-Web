import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import z from "zod";
import { errorHandler } from "./errorHandler";
import { validate } from "./validate";

const ParamsModel = z.object({
  canvasId: z.coerce.number().int().positive(),
});

const QueryModel = z.object({
  page: z.coerce.number().int().positive(),
});

const BodyModel = z.object({
  name: z.string().min(1),
});

const createApp = () => {
  const app = express();
  app.use(express.json());

  app.post(
    "/things/:canvasId",
    validate(
      { params: ParamsModel, query: QueryModel, body: BodyModel },
      (req, res) => {
        res.status(200).json({
          params: req.params,
          query: req.query,
          body: req.body,
        });
      },
    ),
  );

  app.use(errorHandler);
  return app;
};

describe("validate middleware", () => {
  it("passes typed and coerced data through to the handler on success", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/things/42?page=3")
      .send({ name: "hello" });

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      params: { canvasId: 42 },
      query: { page: 3 },
      body: { name: "hello" },
    });
  });

  it("returns 400 with the body errors when the body is invalid", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/things/42?page=3")
      .send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid request data");
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].path).toEqual(["name"]);
  });

  it("returns 400 with the query errors when the query is invalid", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/things/42?page=oops")
      .send({ name: "hello" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid request data");
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].path).toEqual(["page"]);
  });

  it("returns 400 with the params errors when the params are invalid", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/things/not-a-number?page=3")
      .send({ name: "hello" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid request data");
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].path).toEqual(["canvasId"]);
  });

  it("merges issues from body, query, and params into one 400 response", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/things/not-a-number?page=oops")
      .send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid request data");
    expect(response.body.errors).toHaveLength(3);
    const paths = response.body.errors
      .map((issue: { path: PropertyKey[] }) => issue.path[0])
      .sort();
    expect(paths).toEqual(["canvasId", "name", "page"]);
  });

  it("does not run the handler when validation fails", async () => {
    const app = express();
    app.use(express.json());
    const handler = vi.fn();
    app.post(
      "/things/:canvasId",
      validate({ params: ParamsModel }, async (_req, res) => {
        handler();
        res.status(200).end();
      }),
    );
    app.use(errorHandler);

    await request(app).post("/things/not-a-number");

    expect(handler).not.toHaveBeenCalled();
  });

  it("works without any schemas (passes through immediately)", async () => {
    const app = express();
    app.use(express.json());
    app.get(
      "/healthz",
      validate({}, (_req, res) => {
        res.status(204).end();
      }),
    );
    app.use(errorHandler);

    const response = await request(app).get("/healthz");
    expect(response.status).toBe(204);
  });
});
