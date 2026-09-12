import { Injectable } from "@nestjs/common";

@Injectable()
export class DestinationService {
  findAll() {
    return {
      message: "Destination service working",
    };
  }

  findOne(id: string) {
    return {
      id,
      message: "Find destination",
    };
  }
}