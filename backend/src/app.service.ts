import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: "ok",
      service: "travel-platform-backend",
      timestamp: new Date().toISOString(),
    };
  }
}
