import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Protects a route: requires a valid `Authorization: Bearer <accessToken>`
 * header. Delegates verification to JwtStrategy.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
