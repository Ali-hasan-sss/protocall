import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { firebaseInit } from "./firebase";
import { json, urlencoded } from "body-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true, bodyParser: true });
  firebaseInit();
  app.enableCors();
  app.setGlobalPrefix('api');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));
  await app.listen(3000);
}
bootstrap();
