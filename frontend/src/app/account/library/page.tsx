import { Bookmark } from "lucide-react";
import { EmptyState } from "@/components/account/empty-state";

export const metadata = { title: "Library — Travel Platform" };

export default function LibraryPage() {
  return (
    <EmptyState
      icon={Bookmark}
      title="Your library is empty"
      description="Destinations and tours you save will show up here once the Library module is built."
    />
  );
}
