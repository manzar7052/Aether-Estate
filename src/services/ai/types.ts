import type { PropertyStatus, PropertyType } from "@/types/database";

export type MessageRole = "user" | "assistant" | "system";

export interface CompactProperty {
  id: string;
  title: string;
  price: number;
  city: string;
  state: string;
  property_type: PropertyType;
  bedrooms: number | null;
  bathrooms: number;
  area_sqft: number | null;
  status: PropertyStatus;
  image_url: string;
  url: string;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  properties?: CompactProperty[];
}

export interface ToolCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  disableTools?: boolean;
  toolContext?: {
    conversationId?: string;
    accessToken?: string;
    isConsentConfirmed?: boolean;
  };
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AIResponse {
  message: ChatMessage;
  model: string;
  provider: string;
  properties?: CompactProperty[];
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
}

export interface AIProvider {
  readonly name: string;
  generateResponse(
    messages: ChatMessage[],
    options?: GenerateOptions,
  ): Promise<AIResponse>;
}
