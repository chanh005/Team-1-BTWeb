"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * UI preparation only, as scoped for Phase 3. There is no
 * `PATCH /users/me/password` (or similar) endpoint yet, so this
 * deliberately does not call an API or pretend to succeed — see
 * "Remaining API requirements" in the phase report. The fields are
 * left interactive so the layout/validation can be reviewed, but the
 * submit action is disabled with an honest explanation.
 */
export function ChangePasswordForm() {
  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const passwordsMatch =
    values.newPassword.length === 0 ||
    values.newPassword === values.confirmPassword;

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={(e) =>
            setValues((v) => ({ ...v, currentPassword: e.target.value }))
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={values.newPassword}
          onChange={(e) =>
            setValues((v) => ({ ...v, newPassword: e.target.value }))
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) =>
            setValues((v) => ({ ...v, confirmPassword: e.target.value }))
          }
          aria-invalid={!passwordsMatch}
        />
        {!passwordsMatch && (
          <p className="text-sm text-red-600">Passwords do not match.</p>
        )}
      </div>

      <Button type="submit" disabled className="w-fit">
        Update password
      </Button>
      <p className="text-xs text-muted-foreground">
        Changing your password isn&apos;t available yet — this form is a
        preview of the upcoming UI.
      </p>
    </form>
  );
}
