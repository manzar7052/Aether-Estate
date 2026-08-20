export * from "./types";
export * from "./system-prompt";
export * from "./tools";
export * from "./gemini-provider";
export * from "./provider";
export * from "./ai-service";
export * from "./qualification";

/**
 * Checks if the AI provider environment is configured.
 */
export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}
