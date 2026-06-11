import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { createZodDto, ZodResponse, ZodSerializerDto } from "nestjs-zod";
import request from "supertest";
import { z } from "zod";
import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";

class TestParamsDto extends createZodDto(
  z.object({ canvasId: z.coerce.number().int().positive() }),
) {}
class TestQueryDto extends createZodDto(
  z.object({ page: z.coerce.number().int().positive() }),
) {}
class TestBodyDto extends createZodDto(z.object({ name: z.string().min(1) })) {}

class TestWidgetDto extends createZodDto(
  z.object({ id: z.number().int(), name: z.string() }),
) {}

let handlerRuns = 0;

@Controller()
class TestController {
  @Post("test/:canvasId")
  echo(
    @Param() params: TestParamsDto,
    @Query() query: TestQueryDto,
    @Body() body: TestBodyDto,
  ) {
    handlerRuns += 1;
    return { params, query, body };
  }

  // Deliberately not typed with a zod DTO; strictSchemaDeclaration must
  // reject this at run time.
  @Get("test/unvalidated/:id")
  unvalidated(@Param("id") id: string) {
    return { id };
  }
}

@Controller()
class HealthzController {
  @Get("healthz")
  @HttpCode(204)
  healthz(): void {}
}

@Controller()
class WidgetsController {
  @Get("widgets/valid")
  @ZodResponse({ type: TestWidgetDto })
  valid() {
    // Extra key exercises the strip behaviour; assigning to a variable first
    // dodges TypeScript's excess-property check on object literals.
    const widget = { id: 1, name: "ok", internalSecret: "do-not-leak" };
    return widget;
  }

  // @ZodSerializerDto instead of @ZodResponse because the mismatch must get
  // past the compile-time return-type check to exercise the run-time failure.
  @Get("widgets/invalid")
  @ZodSerializerDto(TestWidgetDto)
  invalid() {
    return { id: "not-a-number" };
  }
}

describe("Zod validation & serialization (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestController, HealthzController, WidgetsController],
    }).compile();

    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    handlerRuns = 0;
  });

  it("passes typed and coerced data through to the handler on success", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/test/42?page=3")
      .send({ name: "hello" });

    expect(response.status).toBe(201);
    expect(response.body).toStrictEqual({
      params: { canvasId: 42 },
      query: { page: 3 },
      body: { name: "hello" },
    });
  });

  it("returns 400 with the body errors when the body is invalid", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/test/42?page=3")
      .send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid request data");
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].path).toEqual(["name"]);
  });

  it("returns 400 with the query errors when the query is invalid", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/test/42?page=oops")
      .send({ name: "hello" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid request data");
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].path).toEqual(["page"]);
  });

  it("returns 400 with the params errors when the params are invalid", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/test/not-a-number?page=3")
      .send({ name: "hello" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid request data");
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].path).toEqual(["canvasId"]);
  });

  it("returns the issues of a single source when multiple sources are invalid", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/test/not-a-number?page=oops")
      .send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid request data");
    expect(response.body.errors).toHaveLength(1);
    expect(["canvasId", "page", "name"]).toContain(
      response.body.errors[0].path[0],
    );
  });

  it("does not run the handler when validation fails", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/test/not-a-number?page=3")
      .send({ name: "hello" });

    expect(handlerRuns).toBe(0);
  });

  it("works without any schemas (passes through immediately)", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/healthz");

    expect(response.status).toBe(204);
  });

  it("rejects parameters that are not typed with a zod DTO", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/test/unvalidated/123",
    );

    expect(response.status).toBe(500);
    expect(response.body).toStrictEqual({ message: "Internal Server Error" });
  });

  it("serializes @ZodResponse bodies and strips unknown keys", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/widgets/valid",
    );

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ id: 1, name: "ok" });
  });

  it("logs and returns the parity 500 when response serialization fails", async () => {
    // The filter logs through a Logger instance, so spy on the prototype —
    // instance calls never reach the static Logger.error.
    const loggerErrorSpy = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});

    const response = await request(app.getHttpServer()).get(
      "/api/v1/widgets/invalid",
    );

    expect(response.status).toBe(500);
    expect(response.body).toStrictEqual({
      message: "An unexpected error occurred",
    });
    expect(loggerErrorSpy).toHaveBeenCalled();
    loggerErrorSpy.mockRestore();
  });
});
