import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";


@Injectable()
export class TripsService {


  constructor(
    private readonly prisma: PrismaService,
  ) {}



  create(data: any) {

    return this.prisma.trip.create({
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate
          ? new Date(data.startDate)
          : null,
        endDate: data.endDate
          ? new Date(data.endDate)
          : null,

        userId: data.userId,
      },
    });

  }



  findAll() {

    return this.prisma.trip.findMany();

  }



  findOne(id: string) {

    return this.prisma.trip.findUnique({
      where: {
        id,
      },
    });

  }



  remove(id: string) {

    return this.prisma.trip.delete({
      where: {
        id,
      },
    });

  }

}