import { GeminiProvider } from "./gemini-provider";
import type { AIProvider } from "./types";

let cachedProvider: AIProvider | null = null;

/**
 * Provider factory returning the active AIProvider instance.
 * Decouples domain services and API routes from specific AI vendors.
 */
export function getAIProvider(): AIProvider {
  const providerName = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  // If already instantiated for this provider name, reuse
  if (cachedProvider && cachedProvider.name === providerName) {
    return cachedProvider;
  }

  switch (providerName) {
    case "gemini":
    default:
      cachedProvider = new GeminiProvider();
      return cachedProvider;
  }
}
