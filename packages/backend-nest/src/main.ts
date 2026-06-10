import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { type AppConfig, appConfig } from "@/config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const { port } = app.get<AppConfig>(appConfig.KEY);
  await app.listen(port);
}

void bootstrap();
