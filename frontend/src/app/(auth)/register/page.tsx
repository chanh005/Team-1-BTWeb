import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Create account — Travel Platform",
};

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start planning your next trip in minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
