import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Wraps PrismaClient as a Nest-managed provider so the DB connection
 * lifecycle follows the application's lifecycle (connect on init,
 * disconnect on shutdown).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Database connection established");
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
