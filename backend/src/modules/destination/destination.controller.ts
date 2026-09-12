import { Controller, Get, Param } from "@nestjs/common";
import { DestinationService } from "./destination.service";

@Controller("destinations")
export class DestinationController {
  constructor(
    private readonly destinationService: DestinationService,
  ) {}

  @Get()
  findAll() {
    return this.destinationService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.destinationService.findOne(id);
  }
}