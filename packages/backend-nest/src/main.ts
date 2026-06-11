import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { type AppConfig, appConfig } from "@/config/app.config";
import { setupSwagger } from "@/swagger.setup";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  setupSwagger(app);

  const { port } = app.get<AppConfig>(appConfig.KEY);
  app.enableShutdownHooks();
  await app.listen(port);
}

void bootstrap();
