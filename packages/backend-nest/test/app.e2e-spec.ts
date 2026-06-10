import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";

describe("Bootstrap (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("boots with an empty API surface", async () => {
    await request(app.getHttpServer()).get("/").expect(404);
  });

  it("sends credentialed CORS headers for the frontend origin", async () => {
    const response = await request(app.getHttpServer())
      .get("/")
      .set("Origin", "http://localhost:3000");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("serialises BigInt values as JSON strings", () => {
    expect(JSON.stringify({ id: 204446594050784000n })).toBe(
      '{"id":"204446594050784000"}',
    );
  });
});
