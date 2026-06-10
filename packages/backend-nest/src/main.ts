import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { type AppConfig, appConfig } from "@/config/app.config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const config = new DocumentBuilder()
    .setTitle("Blurple Canvas API")
    .setDescription("API for the Blurple Canvas project")
    // current day
    .setVersion(new Date().toISOString().split("T")[0])
    .build();

  // cleanupOpenApiDoc post-processes the zod-derived schemas; required for
  // correct OpenAPI output when using nestjs-zod with @nestjs/swagger.
  const documentFactory = () =>
    cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  SwaggerModule.setup("docs", app, documentFactory);

  const { port } = app.get<AppConfig>(appConfig.KEY);
  await app.listen(port);
}

void bootstrap();
