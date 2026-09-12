import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import configuration from "./config/configuration";
import { validateEnv } from "./config/env.validation";

import { PrismaModule } from "./prisma/prisma.module";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { DestinationModule } from "./modules/destination/destination.module";
import { TripsModule } from "./modules/trips/trips.module";


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: [".env"],
    }),

    PrismaModule,

    AuthModule,
    UsersModule,
    DestinationModule,
    TripsModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}