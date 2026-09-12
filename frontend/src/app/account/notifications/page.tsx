import { Bell } from "lucide-react";
import { EmptyState } from "@/components/account/empty-state";

export const metadata = { title: "Notifications — Travel Platform" };

export default function NotificationsPage() {
  return (
    <EmptyState
      icon={Bell}
      title="No notifications yet"
      description="Booking confirmations, reminders, and alerts will appear here once notifications are built."
    />
  );
}
