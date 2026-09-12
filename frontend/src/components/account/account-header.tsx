"use client";

import { useAuthStore } from "@/lib/auth-store";

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

export function AccountHeader() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="flex items-center gap-4 border-b border-border pb-6">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-semibold text-muted-foreground">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="h-full w-full object-cover"
          />
        ) : (
          getInitials(user.fullName)
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold">{user.fullName}</p>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}
