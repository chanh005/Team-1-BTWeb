import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DestinationService {
  constructor(
    private prisma: PrismaService,
  ) {}

  // GET ALL
  findAll() {
    return this.prisma.destination.findMany();
  }

  // GET ONE
  findOne(id: string) {
    return this.prisma.destination.findUnique({
      where: {
        id,
      },
    });
  }

  // CREATE
  create(data: any) {
    return this.prisma.destination.create({
      data,
    });
  }

  // UPDATE
  update(id: string, data: any) {
    return this.prisma.destination.update({
      where: {
        id,
      },
      data,
    });
  }

  // DELETE
  remove(id: string) {
    return this.prisma.destination.delete({
      where: {
        id,
      },
    });
  }
}