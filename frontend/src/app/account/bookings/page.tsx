import { CalendarCheck } from "lucide-react";
import { EmptyState } from "@/components/account/empty-state";

export const metadata = { title: "Booking orders — Travel Platform" };

export default function BookingsPage() {
  return (
    <EmptyState
      icon={CalendarCheck}
      title="No bookings yet"
      description="Your booking orders will appear here once the Booking Services module is built."
    />
  );
}
