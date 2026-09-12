import { z } from "zod";

// Kept in sync with backend/src/modules/users/dto/update-user.dto.ts

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100),
  phoneNumber: z.string().trim().optional().or(z.literal("")),
  avatarUrl: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z.string().trim().optional().or(z.literal("")),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
