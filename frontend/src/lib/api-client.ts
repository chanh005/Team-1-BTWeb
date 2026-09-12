import { useAuthStore } from "@/lib/auth-store";
import type { ApiErrorBody } from "@/types/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}
interface ApiFailureEnvelope {
  success: false;
  error: ApiErrorBody;
}
type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiFailureEnvelope;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Skip the automatic refresh-and-retry on 401 (used by the refresh call itself). */
  skipAuthRetry?: boolean;
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Calls POST /auth/refresh using the httpOnly cookie (sent automatically
 * because we always set credentials: "include"). Deduplicates concurrent
 * calls so multiple failed requests don't each trigger their own refresh.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return null;

        const json = (await res.json()) as ApiEnvelope<{
          accessToken: string;
          user: unknown;
        }>;
        if (!json.success) return null;

        useAuthStore.getState().setAuth(
          json.data.user as never,
          json.data.accessToken,
        );
        return json.data.accessToken;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, skipAuthRetry = false } = options;
  const accessToken = useAuthStore.getState().accessToken;

  const doFetch = async (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include", // sends the httpOnly refresh cookie
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch(accessToken);

  // Access token expired mid-session: refresh once, then retry the
  // original request. Never recurse further than one retry.
  if (res.status === 401 && !skipAuthRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
    } else {
      useAuthStore.getState().clearAuth();
    }
  }

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !json || !json.success) {
    const error = json && !json.success ? json.error : null;
    const message = Array.isArray(error?.message)
      ? error.message.join(", ")
      : (error?.message ?? "Something went wrong. Please try again.");
    throw new ApiError(res.status, error?.code ?? "UNKNOWN_ERROR", message);
  }

  return json.data;
}

export { refreshAccessToken };
