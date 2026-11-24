import { z } from "zod";

export const messageRoleSchema = z.enum(["system", "user", "assistant"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const chatMessageSchema = z.object({
  role: messageRoleSchema,
  content: z.string().min(1),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatOptionsSchema = z.object({
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});
export type ChatOptions = z.infer<typeof chatOptionsSchema>;

export const tokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});
export type TokenUsage = z.infer<typeof tokenUsageSchema>;

export const replySchema = z.object({
  text: z.string(),
  usage: tokenUsageSchema,
  provider: z.string().min(1),
  model: z.string().min(1),
});
export type Reply = z.infer<typeof replySchema>;

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  context: z.string().optional(),
  options: chatOptionsSchema.optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;
