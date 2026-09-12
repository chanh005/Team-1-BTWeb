import { apiRequest } from "@/lib/api-client";
import type { User } from "@/types/auth";
import type { UpdateProfileFormValues } from "@/lib/validators/profile.schema";

export function getMeRequest() {
  return apiRequest<User>("/users/me");
}

export function updateMeRequest(values: UpdateProfileFormValues) {
  return apiRequest<User>("/users/me", {
    method: "PATCH",
    body: {
      ...values,
      phoneNumber: values.phoneNumber || undefined,
      avatarUrl: values.avatarUrl || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
    },
  });
}
