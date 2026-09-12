"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validators/auth.schema";
import { registerRequest } from "@/features/auth/api";
import { useAuthStore } from "@/lib/auth-store";
import { ApiError } from "@/lib/api-client";

type FieldErrors = Partial<Record<keyof RegisterFormValues, string>>;

export function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof RegisterFormValues;
        errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const { user, accessToken } = await registerRequest(parsed.data);
      setAuth(user, accessToken);
      router.push("/");
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Unable to create your account right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          autoComplete="name"
          value={values.fullName}
          onChange={(e) =>
            setValues((v) => ({ ...v, fullName: e.target.value }))
          }
          aria-invalid={!!fieldErrors.fullName}
        />
        {fieldErrors.fullName && (
          <p className="text-sm text-red-600">{fieldErrors.fullName}</p>
        )}
      </div>

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
          autoComplete="new-password"
          value={values.password}
          onChange={(e) =>
            setValues((v) => ({ ...v, password: e.target.value }))
          }
          aria-invalid={!!fieldErrors.password}
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters, with a letter and a number.
        </p>
        {fieldErrors.password && (
          <p className="text-sm text-red-600">{fieldErrors.password}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phoneNumber">Phone number (optional)</Label>
        <Input
          id="phoneNumber"
          type="tel"
          autoComplete="tel"
          placeholder="+14155551234"
          value={values.phoneNumber}
          onChange={(e) =>
            setValues((v) => ({ ...v, phoneNumber: e.target.value }))
          }
          aria-invalid={!!fieldErrors.phoneNumber}
        />
        {fieldErrors.phoneNumber && (
          <p className="text-sm text-red-600">{fieldErrors.phoneNumber}</p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
