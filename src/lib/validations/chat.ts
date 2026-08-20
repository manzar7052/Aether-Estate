import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"], {
    message: "Invalid message role.",
  }),
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message cannot exceed 2,000 characters."),
});

export const chatRequestSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation id format.").optional(),
  accessToken: z.string().min(10, "Invalid access token.").optional(),
  confirmConsent: z.boolean().optional(),
  messages: z
    .array(chatMessageSchema)
    .min(1, "At least one message is required.")
    .max(20, "Conversation history cannot exceed 20 messages."),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
