import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { AuthService, AuthTokens } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getRequestMeta(req: Request) {
    return {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    };
  }

  private setRefreshCookie(res: Response, tokens: AuthTokens) {
    const cookieName = this.configService.get<string>(
      "cookies.refreshTokenName",
    );
    const secure = this.configService.get<boolean>("cookies.secure");

    res.cookie(cookieName ?? "refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/api/v1/auth",
      expires: tokens.refreshTokenExpiresAt,
    });
  }

  private clearRefreshCookie(res: Response) {
    const cookieName = this.configService.get<string>(
      "cookies.refreshTokenName",
    );
    res.clearCookie(cookieName ?? "refreshToken", {
      path: "/api/v1/auth",
    });
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.register(
      dto,
      this.getRequestMeta(req),
    );
    this.setRefreshCookie(res, tokens);
    return { user, accessToken: tokens.accessToken };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(
      dto,
      this.getRequestMeta(req),
    );
    this.setRefreshCookie(res, tokens);
    return { user, accessToken: tokens.accessToken };
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = this.configService.get<string>(
      "cookies.refreshTokenName",
    );
    const rawRefreshToken = req.cookies?.[cookieName ?? "refreshToken"];

    await this.authService.logout(rawRefreshToken);
    this.clearRefreshCookie(res);

    return { message: "Logged out successfully" };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = this.configService.get<string>(
      "cookies.refreshTokenName",
    );
    const rawRefreshToken = req.cookies?.[cookieName ?? "refreshToken"];

    const { user, tokens } = await this.authService.refresh(rawRefreshToken);
    this.setRefreshCookie(res, tokens);

    return { user, accessToken: tokens.accessToken };
  }
}
