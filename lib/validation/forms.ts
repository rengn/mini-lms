import { z } from "zod";

const emailSchema = z.email("Enter a valid email address.");
const passwordSchema = z.string().min(1, "Password is required.");

export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpFormSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    repeatPassword: passwordSchema,
  })
  .refine((value) => value.password === value.repeatPassword, {
    message: "Passwords do not match.",
    path: ["repeatPassword"],
  });

export const forgotPasswordFormSchema = z.object({
  email: emailSchema,
});

export const resetPasswordFormSchema = z.object({
  password: passwordSchema,
});

export const consultationFormSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name.").max(100),
  lastName: z.string().trim().min(1, "Enter a last name.").max(100),
  reason: z.string().trim().min(1, "Enter a reason.").max(1000),
  scheduledAt: z.string().min(1, "Choose a date and time."),
});

export const consultationRescheduleFormSchema = z.object({
  scheduledAt: z.string().min(1, "Choose a date and time."),
});
