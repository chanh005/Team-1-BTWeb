import { RequireAuth } from "@/components/account/require-auth";
import { AccountHeader } from "@/components/account/account-header";
import { AccountSidebar } from "@/components/account/account-sidebar";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="container flex flex-col gap-6 py-8">
        <AccountHeader />
        <div className="flex flex-col gap-6 md:flex-row">
          <AccountSidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </RequireAuth>
  );
}
