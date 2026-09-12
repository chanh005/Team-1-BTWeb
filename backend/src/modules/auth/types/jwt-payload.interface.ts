/**
 * Shape of the payload encoded in the access token.
 */
export interface JwtPayload {
  sub: string; // user id
  email: string;
}

/**
 * Shape of the payload encoded in the refresh token.
 * `jti` (JWT ID) uniquely identifies this refresh token so it can be
 * matched against its hashed record in the database and revoked.
 */
export interface RefreshTokenPayload {
  sub: string; // user id
  jti: string;
}
