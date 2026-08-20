import { GoogleGenAI, type Content } from "@google/genai";
import { getAiConfig } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";
import {
  SEARCH_PROPERTIES_DECLARATION,
  CAPTURE_LEAD_DECLARATION,
  executeTool,
} from "./tools";
import type {
  AIProvider,
  AIResponse,
  ChatMessage,
  CompactProperty,
  GenerateOptions,
  ToolCall,
} from "./types";

const MAX_TOOL_ROUNDS = 2; // Prevent infinite tool-calling loops

export class GeminiProvider implements AIProvider {
  public readonly name = "gemini";
  private client: GoogleGenAI | null = null;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const config = this.resolveConfig(apiKey, model);
    this.model = config.model;
    if (config.apiKey) {
      this.client = new GoogleGenAI({ apiKey: config.apiKey });
    }
  }

  private resolveConfig(apiKey?: string, model?: string) {
    try {
      const env = getAiConfig();
      return {
        apiKey: apiKey || env.geminiApiKey,
        model: model || env.geminiModel || "gemini-3.6-flash",
      };
    } catch {
      return {
        apiKey: apiKey || process.env.GEMINI_API_KEY || "",
        model: model || process.env.GEMINI_MODEL || "gemini-3.6-flash",
      };
    }
  }

  private getClient(): GoogleGenAI {
    if (this.client) {
      return this.client;
    }
    const { geminiApiKey } = getAiConfig();
    this.client = new GoogleGenAI({ apiKey: geminiApiKey });
    return this.client;
  }

  public async generateResponse(
    messages: ChatMessage[],
    options?: GenerateOptions,
  ): Promise<AIResponse> {
    const client = this.getClient();

    // Map provider-agnostic ChatMessage[] to Gemini contents format
    const contents: Content[] = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

    // Extract any system messages to append to system instruction
    const systemMessages = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const systemInstruction = [options?.systemInstruction, systemMessages]
      .filter(Boolean)
      .join("\n\n");

    const tools = options?.disableTools
      ? undefined
      : [
          {
            functionDeclarations: [
              SEARCH_PROPERTIES_DECLARATION,
              CAPTURE_LEAD_DECLARATION,
            ],
          },
        ];

    const collectedProperties: CompactProperty[] = [];
    const executedToolCalls: ToolCall[] = [];
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let currentRound = 0;

    try {
      while (currentRound < MAX_TOOL_ROUNDS) {
        currentRound++;

        const response = await client.models.generateContent({
          model: this.model,
          contents,
          config: {
            systemInstruction: systemInstruction || undefined,
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 1000,
            tools: currentRound >= MAX_TOOL_ROUNDS ? undefined : tools,
          },
        });

        // Accumulate usage if available
        if (response.usageMetadata) {
          totalUsage = {
            promptTokens:
              (totalUsage.promptTokens || 0) +
              (response.usageMetadata.promptTokenCount || 0),
            completionTokens:
              (totalUsage.completionTokens || 0) +
              (response.usageMetadata.candidatesTokenCount || 0),
            totalTokens:
              (totalUsage.totalTokens || 0) +
              (response.usageMetadata.totalTokenCount || 0),
          };
        }

        const functionCalls = response.functionCalls;

        // If no tool call was requested by the model, we have the final natural language answer
        if (!functionCalls || functionCalls.length === 0) {
          const responseText = response.text?.trim() || "";

          if (!responseText) {
            throw new AppError(
              "AI_EMPTY_RESPONSE",
              "The assistant was unable to generate a response. Please try again.",
              500,
            );
          }

          return {
            message: {
              role: "assistant",
              content: responseText,
              properties:
                collectedProperties.length > 0
                  ? collectedProperties
                  : undefined,
            },
            model: this.model,
            provider: this.name,
            properties:
              collectedProperties.length > 0 ? collectedProperties : undefined,
            toolCalls:
              executedToolCalls.length > 0 ? executedToolCalls : undefined,
            usage: totalUsage.totalTokens > 0 ? totalUsage : undefined,
          };
        }

        // Handle tool calls requested by Gemini
        if (response.candidates && response.candidates[0]?.content) {
          contents.push(response.candidates[0].content);
        }

        for (const call of functionCalls) {
          const toolName = call.name || "searchProperties";
          executedToolCalls.push({
            id: call.id,
            name: toolName,
            args: (call.args as Record<string, unknown>) || {},
          });

          console.log(
            `[GeminiProvider] Model requested tool call '${toolName}' with args:`,
            JSON.stringify(call.args),
          );

          // Execute tool through controlled allowlisted dispatcher
          const toolResult = await executeTool(
            toolName,
            (call.args as Record<string, unknown>) || {},
            options?.toolContext,
          );

          // Collect properties for rich card presentation in UI
          if (toolResult.compactProperties.length > 0) {
            for (const prop of toolResult.compactProperties) {
              if (!collectedProperties.some((p) => p.id === prop.id)) {
                collectedProperties.push(prop);
              }
            }
          }

          // Send function execution response back to model
          contents.push({
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: toolName,
                  response: toolResult.response,
                  id: call.id,
                },
              },
            ],
          });
        }
      }

      // Loop ceiling reached: Generate final synthesis without further tool calls
      const finalResponse = await client.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1000,
        },
      });

      const responseText = finalResponse.text?.trim() || "";

      return {
        message: {
          role: "assistant",
          content:
            responseText ||
            "I retrieved the listings from our database matching your criteria above.",
          properties:
            collectedProperties.length > 0 ? collectedProperties : undefined,
        },
        model: this.model,
        provider: this.name,
        properties:
          collectedProperties.length > 0 ? collectedProperties : undefined,
        toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
        usage: totalUsage.totalTokens > 0 ? totalUsage : undefined,
      };
    } catch (err: unknown) {
      this.handleGeminiError(err);
    }
  }

  private handleGeminiError(err: unknown): never {
    if (err instanceof AppError) {
      throw err;
    }

    const message = err instanceof Error ? err.message : String(err);

    // Rate limiting
    if (
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.includes("Quota")
    ) {
      throw new AppError(
        "RATE_LIMIT_EXCEEDED",
        "The AI service is currently busy handling high demand. Please wait a moment and try again.",
        429,
      );
    }

    // Authentication / Invalid key
    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("401") ||
      message.includes("403") ||
      message.includes("permission")
    ) {
      throw new AppError(
        "AI_AUTH_ERROR",
        "Unable to authenticate with the Gemini API. Please check your GEMINI_API_KEY configuration.",
        503,
      );
    }

    // Timeout or network failure
    if (
      message.includes("timeout") ||
      message.includes("ECONNRESET") ||
      message.includes("fetch failed")
    ) {
      throw new AppError(
        "AI_NETWORK_ERROR",
        "Network connection to the AI service timed out. Please try again.",
        504,
      );
    }

    console.error("[GeminiProvider Error]:", err);

    // Generic safe error
    throw new AppError(
      "AI_GENERATION_FAILED",
      "We encountered an issue processing your request. Please try again.",
      500,
    );
  }
}
