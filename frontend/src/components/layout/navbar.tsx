"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { logoutRequest } from "@/features/auth/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Top-level navigation. Auth-aware: shows Login/Register when signed out,
 * and the user's name + logout when signed in. The full account dashboard
 * (profile, trips, bookings, etc.) is out of scope for this phase.
 */
export function Navbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  async function handleLogout() {
    try {
      await logoutRequest();
    } finally {
      clearAuth();
      router.push("/login");
    }
  }

  return (
    <header className="border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="font-semibold">
          Travel Platform
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Explore</span>
          <span className="text-muted-foreground">Trips</span>

          {!isInitialized ? null : user ? (
            <>
              <span className="text-muted-foreground">{user.fullName}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted-foreground">
                Log in
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
