import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/types/jwt-payload.interface";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  async getMe(@CurrentUser() currentUser: JwtPayload) {
    return this.usersService.getById(currentUser.sub);
  }

  @Patch("me")
  async updateMe(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateById(currentUser.sub, dto);
  }
}
