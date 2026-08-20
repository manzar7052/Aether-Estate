import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.")
  .max(255);

export const uuidSchema = z.string().uuid("Invalid id.");

export const roleSchema = z.enum(["admin", "agent"]);

export const nonEmptyString = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required.`).max(max);

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^[0-9+().\-\s]*$/, "Enter a valid phone number.")
  .optional()
  .or(z.literal(""));

export const moneySchema = z.coerce.number().nonnegative("Amount cannot be negative.");

export const dateTimeSchema = z.coerce.date();
