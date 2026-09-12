"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from "@/lib/validators/profile.schema";
import { getMeRequest, updateMeRequest } from "@/features/users/api";
import { useAuthStore } from "@/lib/auth-store";
import { ApiError } from "@/lib/api-client";

type FieldErrors = Partial<Record<keyof UpdateProfileFormValues, string>>;

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10); // "YYYY-MM-DD" for <input type="date">
}

export function ProfileForm() {
  const storeUser = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [values, setValues] = useState<UpdateProfileFormValues>({
    fullName: storeUser?.fullName ?? "",
    phoneNumber: storeUser?.phoneNumber ?? "",
    avatarUrl: storeUser?.avatarUrl ?? "",
    dateOfBirth: toDateInputValue(storeUser?.dateOfBirth ?? null),
  });
  const [email, setEmail] = useState(storeUser?.email ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refetch on mount so the form reflects the latest saved data, even if
  // the in-memory store was only populated by the lighter /auth/refresh
  // payload.
  useEffect(() => {
    let cancelled = false;
    getMeRequest()
      .then((user) => {
        if (cancelled) return;
        setValues({
          fullName: user.fullName,
          phoneNumber: user.phoneNumber ?? "",
          avatarUrl: user.avatarUrl ?? "",
          dateOfBirth: toDateInputValue(user.dateOfBirth),
        });
        setEmail(user.email);
      })
      .catch(() => {
        // Non-fatal: the form falls back to whatever was already in the store.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const parsed = updateProfileSchema.safeParse(values);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof UpdateProfileFormValues;
        errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const updated = await updateMeRequest(parsed.data);
      if (accessToken) {
        setAuth(updated, accessToken);
      }
      setSuccessMessage("Profile updated.");
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Unable to update your profile right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
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
        <Input id="email" value={email} disabled />
        <p className="text-xs text-muted-foreground">
          Changing your email isn&apos;t available yet.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phoneNumber">Phone number</Label>
        <Input
          id="phoneNumber"
          type="tel"
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="dateOfBirth">Date of birth</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={values.dateOfBirth}
          onChange={(e) =>
            setValues((v) => ({ ...v, dateOfBirth: e.target.value }))
          }
          aria-invalid={!!fieldErrors.dateOfBirth}
        />
        {fieldErrors.dateOfBirth && (
          <p className="text-sm text-red-600">{fieldErrors.dateOfBirth}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="avatarUrl">Avatar image URL</Label>
        <Input
          id="avatarUrl"
          placeholder="https://…"
          value={values.avatarUrl}
          onChange={(e) =>
            setValues((v) => ({ ...v, avatarUrl: e.target.value }))
          }
          aria-invalid={!!fieldErrors.avatarUrl}
        />
        <p className="text-xs text-muted-foreground">
          Direct file upload isn&apos;t available yet — paste a link to an
          image instead.
        </p>
        {fieldErrors.avatarUrl && (
          <p className="text-sm text-red-600">{fieldErrors.avatarUrl}</p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}
      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
