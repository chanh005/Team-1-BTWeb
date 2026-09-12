/**
 * Minimal, dependency-free environment validation.
 * Fails fast at startup if a required variable is missing,
 * instead of surfacing confusing errors later at runtime.
 */

const REQUIRED_VARS = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
] as const;

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED_VARS.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }

  return config;
}
