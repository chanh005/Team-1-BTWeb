import { apiRequest } from "@/lib/api-client";
import type { AuthResponse, User } from "@/types/auth";
import type { LoginFormValues, RegisterFormValues } from "@/lib/validators/auth.schema";

export function registerRequest(values: RegisterFormValues) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: {
      ...values,
      phoneNumber: values.phoneNumber || undefined,
    },
  });
}

export function loginRequest(values: LoginFormValues) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: values,
  });
}

export function logoutRequest() {
  return apiRequest<{ message: string }>("/auth/logout", { method: "POST" });
}

export function getMeRequest() {
  return apiRequest<User>("/users/me");
}
