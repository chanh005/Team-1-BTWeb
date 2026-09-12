import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  app.enableCors({
    origin: configService.get<string>("cors.origin"),
    credentials: true, // required so the browser sends/receives the refresh cookie
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not defined on the DTO
      forbidNonWhitelisted: true, // reject requests with unknown fields
      transform: true, // auto-transform payloads to DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = configService.get<number>("port") ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend running on http://localhost:${port}/api/v1`);
}

bootstrap();
