export interface AppConfig {
  env: string;
  port: number;
  database: {
    url: string;
  };
  cors: {
    origin: string;
  };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    refreshExpiresInMs: number;
  };
  cookies: {
    refreshTokenName: string;
    secure: boolean;
  };
}

/**
 * Converts a duration string like "15m", "7d", "3600s" into milliseconds.
 * Supports s (seconds), m (minutes), h (hours), d (days).
 */
function parseDurationToMs(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) {
    // Fallback: assume raw seconds if no unit suffix is present.
    const seconds = parseInt(value, 10);
    return Number.isNaN(seconds) ? 0 : seconds * 1000;
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * unitMs[unit];
}

export default (): AppConfig => {
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";

  return {
    env: process.env.NODE_ENV ?? "development",
    port: parseInt(process.env.PORT ?? "4000", 10),
    database: {
      url: process.env.DATABASE_URL ?? "",
    },
    cors: {
      origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? "",
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? "",
      refreshExpiresIn,
      refreshExpiresInMs: parseDurationToMs(refreshExpiresIn),
    },
    cookies: {
      refreshTokenName: process.env.REFRESH_COOKIE_NAME ?? "refreshToken",
      secure: (process.env.NODE_ENV ?? "development") === "production",
    },
  };
};
