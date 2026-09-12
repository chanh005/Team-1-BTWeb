import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from "@nestjs/common";

import { TripsService } from "./trips.service";


@Controller("trips")
export class TripsController {

  constructor(
    private readonly tripsService: TripsService,
  ) {}


  @Post()
  create(
    @Body() body: any,
  ) {
    return this.tripsService.create(body);
  }


  @Get()
  findAll() {
    return this.tripsService.findAll();
  }


  @Get(":id")
  findOne(
    @Param("id") id: string,
  ) {
    return this.tripsService.findOne(id);
  }


  @Delete(":id")
  remove(
    @Param("id") id: string,
  ) {
    return this.tripsService.remove(id);
  }

}