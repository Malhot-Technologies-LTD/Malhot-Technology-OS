import { z } from "zod";

/** Shared by forms (zodResolver) and Server Actions (re-parse). */

export const PASSWORD_MIN_LENGTH = 12;

const email = z
  .email("Enter a valid email address")
  .max(254)
  .transform((v) => v.trim().toLowerCase());
const next = z.string().max(2048).optional();

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(256),
  next,
});
export type SignInInput = z.infer<typeof signInSchema>;

export const magicLinkSchema = z.object({ email, next });
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`).max(256),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

const timezone = z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
  message: "Choose a valid time zone",
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(120),
  title: z
    .string()
    .trim()
    .max(80)
    .transform((v) => (v === "" ? null : v)),
  timezone,
});
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type UpdateProfileOutput = z.output<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(256),
    password: z.string().min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`).max(256),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((v) => v.password !== v.currentPassword, {
    path: ["password"],
    message: "The new password must be different from the current one",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
