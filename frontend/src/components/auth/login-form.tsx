"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth.schema";
import { loginRequest } from "@/features/auth/api";
import { useAuthStore } from "@/lib/auth-store";
import { ApiError } from "@/lib/api-client";

type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

export function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof LoginFormValues;
        errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const { user, accessToken } = await loginRequest(parsed.data);
      setAuth(user, accessToken);
      router.push("/");
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Unable to log in right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email && (
          <p className="text-sm text-red-600">{fieldErrors.email}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) =>
            setValues((v) => ({ ...v, password: e.target.value }))
          }
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && (
          <p className="text-sm text-red-600">{fieldErrors.password}</p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
