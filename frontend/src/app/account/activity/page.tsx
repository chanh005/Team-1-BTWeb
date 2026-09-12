import { History } from "lucide-react";
import { EmptyState } from "@/components/account/empty-state";

export const metadata = { title: "Activity history — Travel Platform" };

export default function ActivityPage() {
  return (
    <EmptyState
      icon={History}
      title="Activity history isn't available yet"
      description="Your account already logs security events (login, logout, etc.) internally, but there's no API endpoint to display them here yet."
    />
  );
}
