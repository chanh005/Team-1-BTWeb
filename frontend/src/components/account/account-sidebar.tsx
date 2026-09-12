"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Bookmark,
  MapPin,
  CalendarCheck,
  CreditCard,
  Star,
  Bell,
  History,
  Shield,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { logoutRequest } from "@/features/auth/api";

const NAV_ITEMS = [
  { href: "/account/profile", label: "Personal information", icon: User },
  { href: "/account/library", label: "Library", icon: Bookmark },
  { href: "/account/trips", label: "My trips", icon: MapPin },
  { href: "/account/bookings", label: "Booking orders", icon: CalendarCheck },
  { href: "/account/payments", label: "Payment history", icon: CreditCard },
  { href: "/account/reviews", label: "My reviews", icon: Star },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/activity", label: "Activity history", icon: History },
  { href: "/account/security", label: "Security settings", icon: Shield },
  { href: "/account/support", label: "Support", icon: HelpCircle },
] as const;

export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
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
    <nav
      aria-label="Account navigation"
      className="flex gap-1 overflow-x-auto pb-2 md:w-64 md:shrink-0 md:flex-col md:overflow-visible md:pb-0"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors md:shrink",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={handleLogout}
        className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted md:mt-2 md:border-t md:border-border md:pt-4"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Logout
      </button>
    </nav>
  );
}
