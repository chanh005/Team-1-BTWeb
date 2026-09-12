import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Log in — Travel Platform",
};

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>
          Welcome back. Enter your details to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
