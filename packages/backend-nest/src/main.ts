import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
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

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, documentFactory);

  const { port } = app.get<AppConfig>(appConfig.KEY);
  app.enableShutdownHooks();
  await app.listen(port);
}

void bootstrap();
