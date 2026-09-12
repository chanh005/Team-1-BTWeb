import { Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { EmptyState } from "@/components/account/empty-state";

export const metadata = { title: "Security settings — Travel Platform" };

export default function SecurityPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Update the password used to log in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>
            See where you&apos;re logged in and sign out of other devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Shield}
            title="Session management isn't available yet"
            description="Your refresh tokens are already tracked and revocable server-side — this view just needs an API endpoint to list and revoke them."
          />
        </CardContent>
      </Card>
    </div>
  );
}
