import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtPayload } from "../types/jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>("jwt.accessSecret");
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is not configured");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Called automatically by Passport once the token signature/expiry
   * check succeeds. The return value becomes `request.user`.
   */
  validate(payload: JwtPayload): JwtPayload {
    if (!payload?.sub) {
      throw new UnauthorizedException("Invalid access token");
    }
    return { sub: payload.sub, email: payload.email };
  }
}
