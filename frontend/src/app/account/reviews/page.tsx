import { Star } from "lucide-react";
import { EmptyState } from "@/components/account/empty-state";

export const metadata = { title: "My reviews — Travel Platform" };

export default function ReviewsPage() {
  return (
    <EmptyState
      icon={Star}
      title="No reviews yet"
      description="Reviews you write after a trip will appear here once the Reviews module is built."
    />
  );
}
