import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Used on account pages whose underlying feature (library, trips,
 * bookings, payments, reviews, notifications, activity) has no backend
 * API yet. Intentionally shows no fabricated data — just an honest
 * "not available yet" state, per Phase 3 scope.
 */
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="font-medium">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
