"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Real (client-side) enforcement of "only authenticated users can access
 * account pages". middleware.ts only does an edge-level heuristic (does a
 * refresh cookie exist?) because it can't see the in-memory access token
 * or verify a JWT's validity without an extra network round trip. This
 * component waits for AuthProvider's bootstrap to finish, then redirects
 * if there's genuinely no authenticated user.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login");
    }
  }, [isInitialized, user, router]);

  if (!isInitialized) {
    return (
      <div className="container flex items-center justify-center py-24 text-muted-foreground">
        Loading your account…
      </div>
    );
  }

  if (!user) {
    // Redirect above is in flight; render nothing to avoid a content flash.
    return null;
  }

  return <>{children}</>;
}
