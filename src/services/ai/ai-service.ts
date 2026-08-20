import { getAIProvider } from "./provider";
import { AETHER_ESTATES_SYSTEM_PROMPT } from "./system-prompt";
import { executeFallbackChat } from "./rule-fallback";
import type { AIResponse, ChatMessage, GenerateOptions } from "./types";

export interface ChatServiceOptions extends GenerateOptions {
  customSystemPrompt?: string;
}

/**
 * High-level AI domain service for chat interactions.
 * Injects system prompts, orchestrates providers, and logs execution timing.
 * Features automatic high-availability fallback when external API quotas are exhausted.
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  options?: ChatServiceOptions,
): Promise<AIResponse> {
  const provider = getAIProvider();
  const startTime = Date.now();

  const systemInstruction =
    options?.customSystemPrompt ||
    options?.systemInstruction ||
    AETHER_ESTATES_SYSTEM_PROMPT;

  try {
    const response = await provider.generateResponse(messages, {
      ...options,
      systemInstruction,
    });

    const durationMs = Date.now() - startTime;

    // Structured server-side logging for development & debugging (never logs secrets/API keys)
    console.log(
      JSON.stringify({
        level: "info",
        service: "ai-service",
        provider: response.provider,
        model: response.model,
        messageCount: messages.length,
        durationMs,
        tokens: response.usage,
        timestamp: new Date().toISOString(),
      }),
    );

    return response;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "ai-service",
        fallback: "activating-concierge-fallback",
        provider: provider.name,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );

    // High availability fallback: keep concierge active with deterministic tool execution
    return await executeFallbackChat(messages, options);
  }
}
