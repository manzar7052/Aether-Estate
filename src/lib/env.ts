import { EnvError } from "@/lib/utils/errors";

export type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export type AiEnv = {
  provider: string;
  geminiApiKey: string;
  geminiModel: string;
};

function read(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() ? value.trim() : undefined;
}

export function getPublicEnv(): PublicEnv {
  const supabaseUrl =
    read("NEXT_PUBLIC_SUPABASE_URL") ||
    "https://htetmxdtvrqmcuhddfff.supabase.co";
  const supabaseAnonKey =
    read("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    "sb_publishable_ZbFRpqzyh0i27WzWVlCiiQ_FpxZRQWu";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new EnvError(
      "Missing client-safe Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example).",
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function hasPublicEnv(): boolean {
  try {
    getPublicEnv();
    return true;
  } catch {
    return false;
  }
}

export function getServiceRoleKey(): string {
  const key =
    read("SUPABASE_SERVICE_ROLE_KEY") ||
    "sb_secret_nHSMYynZupblgblm7HOr4Q_rO0qVPpU";
  if (!key) {
    throw new EnvError(
      "Missing server-only secret SUPABASE_SERVICE_ROLE_KEY. This key must never be exposed to the client.",
    );
  }
  return key;
}

export function getAiConfig(): AiEnv {
  const provider = read("AI_PROVIDER") || "gemini";
  const geminiApiKey =
    read("GEMINI_API_KEY") ||
    "AQ.Ab8RN6Jz1SyHm9fpGIylpGdat94DDwlUVAjmqsIZvgkJphOyOQ";
  const geminiModel = read("GEMINI_MODEL") || "gemini-2.5-flash";

  if (!geminiApiKey) {
    throw new EnvError(
      "Missing server-only secret GEMINI_API_KEY. Add GEMINI_API_KEY to your .env.local file.",
    );
  }

  return {
    provider,
    geminiApiKey,
    geminiModel,
  };
}

export function hasGeminiKey(): boolean {
  return Boolean(
    read("GEMINI_API_KEY") ||
      "AQ.Ab8RN6Jz1SyHm9fpGIylpGdat94DDwlUVAjmqsIZvgkJphOyOQ",
  );
}
