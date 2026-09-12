import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/components/account/profile-form";

export const metadata = {
  title: "Personal information — Travel Platform",
};

export default function ProfilePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal information</CardTitle>
        <CardDescription>
          Update your name, contact details, and avatar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm />
      </CardContent>
    </Card>
  );
}
