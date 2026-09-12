import { MapPin } from "lucide-react";
import { EmptyState } from "@/components/account/empty-state";

export const metadata = { title: "My trips — Travel Platform" };

export default function TripsPage() {
  return (
    <EmptyState
      icon={MapPin}
      title="No trips yet"
      description="Your planned and past trips will appear here once the Trip Management module is built."
    />
  );
}
