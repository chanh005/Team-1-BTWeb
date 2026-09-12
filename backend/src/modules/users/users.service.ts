import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { SafeUser } from "../auth/auth.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeUser(user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    avatarUrl: string | null;
    dateOfBirth: Date | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): SafeUser {
    const {
      id,
      fullName,
      email,
      phoneNumber,
      avatarUrl,
      dateOfBirth,
      status,
      createdAt,
      updatedAt,
    } = user;
    return {
      id,
      fullName,
      email,
      phoneNumber,
      avatarUrl,
      dateOfBirth,
      status,
      createdAt,
      updatedAt,
    };
  }

  async getById(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return this.sanitizeUser(user);
  }

  async updateById(userId: string, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.phoneNumber !== undefined
          ? { phoneNumber: dto.phoneNumber }
          : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.dateOfBirth !== undefined
          ? { dateOfBirth: new Date(dto.dateOfBirth) }
          : {}),
      },
    });
    return this.sanitizeUser(user);
  }
}
