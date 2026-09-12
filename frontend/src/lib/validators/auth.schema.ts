import { z } from "zod";

// Kept in sync with backend/src/modules/auth/dto/register.dto.ts and
// login.dto.ts so the frontend rejects obviously-invalid input before
// making a network request.

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /(?=.*[A-Za-z])(?=.*\d)/,
      "Password must contain at least one letter and one number",
    ),
  phoneNumber: z.string().trim().optional().or(z.literal("")),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
