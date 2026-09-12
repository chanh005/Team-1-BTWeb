import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { JwtPayload } from "../../modules/auth/types/jwt-payload.interface";

/**
 * Extracts the authenticated user's JWT payload, attached to the request
 * by JwtAuthGuard/JwtStrategy. Usage: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as JwtPayload;
  },
);
