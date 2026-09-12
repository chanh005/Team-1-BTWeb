"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { refreshAccessToken } from "@/lib/api-client";

/**
 * On first mount, attempts a silent /auth/refresh using the httpOnly
 * cookie so a page reload doesn't force the user to log in again (the
 * access token itself lives only in memory and is lost on reload).
 * If there's no valid refresh cookie, this just fails quietly and the
 * user is treated as logged out.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let cancelled = false;

    refreshAccessToken().finally(() => {
      if (!cancelled) setInitialized();
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
