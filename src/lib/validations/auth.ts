import { z } from "zod";
import { emailSchema, nonEmptyString } from "./common";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(128),
});

export const signupSchema = z.object({
  fullName: nonEmptyString("Full name", 120),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
