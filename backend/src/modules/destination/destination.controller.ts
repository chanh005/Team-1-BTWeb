import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";

import { DestinationService } from "./destination.service";

@Controller("destinations")
export class DestinationController {
  constructor(
    private readonly destinationService: DestinationService,
  ) {}

  // GET /api/v1/destinations
  @Get()
  findAll() {
    return this.destinationService.findAll();
  }

  // GET /api/v1/destinations/:id
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.destinationService.findOne(id);
  }

  // POST /api/v1/destinations
  @Post()
  create(@Body() data: any) {
    return this.destinationService.create(data);
  }

  // PATCH /api/v1/destinations/:id
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() data: any,
  ) {
    return this.destinationService.update(id, data);
  }

  // DELETE /api/v1/destinations/:id
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.destinationService.remove(id);
  }
}