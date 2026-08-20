import { z } from "zod";
import { emailSchema, uuidSchema, optionalPhoneSchema } from "./common";

export const propertyInquirySchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name cannot exceed 100 characters."),
  email: emailSchema,
  phone: optionalPhoneSchema,
  property_id: uuidSchema,
  message: z
    .string()
    .trim()
    .min(5, "Message must be at least 5 characters.")
    .max(1000, "Message cannot exceed 1000 characters."),
  intent: z.enum(["buy", "rent", "sell", "unknown"]).default("buy"),
});

export type PropertyInquiryInput = z.infer<typeof propertyInquirySchema>;

export const generalContactSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name cannot exceed 100 characters."),
  email: emailSchema,
  phone: optionalPhoneSchema,
  city: z.string().trim().max(100).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(5, "Message must be at least 5 characters.")
    .max(1000, "Message cannot exceed 1000 characters."),
});

export type GeneralContactInput = z.infer<typeof generalContactSchema>;
