import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload, RefreshTokenPayload } from "./types/jwt-payload.interface";

const SALT_ROUNDS = 12;

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface SafeUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  dateOfBirth: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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

  private hashToken(rawToken: string): string {
    // Refresh tokens are opaque JWTs; we only ever store/compare a SHA-256
    // digest of them, so a leaked database can never be used to log in.
    return createHash("sha256").update(rawToken).digest("hex");
  }

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessPayload: JwtPayload = { sub: userId, email };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>("jwt.accessSecret"),
      expiresIn: this.configService.get<string>("jwt.accessExpiresIn"),
    });

    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: userId, jti };
    const refreshExpiresIn = this.configService.get<string>(
      "jwt.refreshExpiresIn",
    );
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>("jwt.refreshSecret"),
      expiresIn: refreshExpiresIn,
    });

    const refreshExpiresInMs = this.configService.get<number>(
      "jwt.refreshExpiresInMs",
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + (refreshExpiresInMs ?? 7 * 24 * 60 * 60 * 1000),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return { accessToken, refreshToken, refreshTokenExpiresAt };
  }

  private async logActivity(
    userId: string,
    action: string,
    meta?: RequestMetadata,
  ): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        userId,
        action,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });
  }

  async register(
    dto: RegisterDto,
    meta?: RequestMetadata,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        phoneNumber: dto.phoneNumber,
      },
    });

    const tokens = await this.issueTokens(user.id, user.email);
    await this.logActivity(user.id, "REGISTER", meta);

    return { user: this.sanitizeUser(user), tokens };
  }

  async login(
    dto: LoginDto,
    meta?: RequestMetadata,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Same error for "no such user" and "wrong password" so we never
    // reveal which emails are registered.
    const invalidCredentialsError = new UnauthorizedException(
      "Invalid email or password",
    );

    if (!user) {
      throw invalidCredentialsError;
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      await this.logActivity(user.id, "LOGIN_FAILED", meta);
      throw invalidCredentialsError;
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("This account is not active");
    }

    const tokens = await this.issueTokens(user.id, user.email);
    await this.logActivity(user.id, "LOGIN", meta);

    return { user: this.sanitizeUser(user), tokens };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (record && !record.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });
      await this.logActivity(record.userId, "LOGOUT");
    }
  }

  async refresh(
    rawRefreshToken: string | undefined,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException("Refresh token missing");
    }

    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(rawRefreshToken, {
        secret: this.configService.get<string>("jwt.refreshSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.revokedAt ||
      record.expiresAt.getTime() < Date.now() ||
      record.userId !== payload.sub
    ) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
    });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not available");
    }

    // Rotate: revoke the used refresh token and issue a brand new pair.
    // This limits the damage if a refresh token is ever stolen (it can
    // only be replayed once before rotation invalidates it).
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.email);

    return { user: this.sanitizeUser(user), tokens };
  }
}
