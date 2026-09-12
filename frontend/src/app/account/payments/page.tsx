import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/account/empty-state";

export const metadata = { title: "Payment history — Travel Platform" };

export default function PaymentsPage() {
  return (
    <EmptyState
      icon={CreditCard}
      title="No payment history yet"
      description="Your payment records will appear here once the Booking & Payment module is built."
    />
  );
}
