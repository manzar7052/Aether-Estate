import { GoogleGenAI } from "@google/genai";
import { getAiConfig } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";
import {
  AI_QUALIFICATION_SYSTEM_PROMPT,
  buildQualificationPrompt,
  type QualificationContextInput,
} from "./prompt";
import { rawAISignalsSchema, type AIQualificationSignals } from "./schema";

export interface ExtractionResult {
  signals: AIQualificationSignals;
  model: string;
  durationMs: number;
}

/**
 * Executes structured AI qualification extraction using the configured Gemini model.
 * Validates output strictly with Zod schema and enforces confidence bounds.
 */
export async function extractQualificationSignals(
  context: QualificationContextInput,
): Promise<ExtractionResult> {
  const startTime = Date.now();

  let apiKey: string;
  let modelName = "gemini-3.6-flash";

  try {
    const aiConfig = getAiConfig();
    apiKey = aiConfig.geminiApiKey;
    if (aiConfig.geminiModel) {
      modelName = aiConfig.geminiModel;
    }
  } catch {
    apiKey = process.env.GEMINI_API_KEY || "";
    modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  }

  if (!apiKey) {
    throw new AppError(
      "AI_CONFIG_MISSING",
      "Gemini API key is not configured.",
      500,
    );
  }

  const client = new GoogleGenAI({ apiKey });
  const prompt = buildQualificationPrompt(context);

  try {
    let response;
    try {
      response = await client.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: AI_QUALIFICATION_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          temperature: 0.1, // Low temperature for high precision extraction
          maxOutputTokens: 1200,
        },
      });
    } catch (initialErr: unknown) {
      const errMsg = String(initialErr);
      if (
        errMsg.includes("404") ||
        errMsg.includes("not longer available") ||
        errMsg.includes("NOT_FOUND")
      ) {
        console.warn(
          `[AI Extractor] Falling back from ${modelName} to gemini-3.6-flash`,
        );
        modelName = "gemini-3.6-flash";
        response = await client.models.generateContent({
          model: "gemini-3.6-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction: AI_QUALIFICATION_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 1200,
          },
        });
      } else {
        throw initialErr;
      }
    }

    const responseText = response.text?.trim();

    if (!responseText) {
      throw new AppError(
        "AI_EXTRACTION_EMPTY",
        "The AI model returned an empty response.",
        500,
      );
    }

    // Parse JSON
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      // In case of markdown formatting ```json ... ```
      const cleaned = responseText.replace(/```json\n?|\n?```/g, "").trim();
      parsedJson = JSON.parse(cleaned);
    }

    // Validate with Zod
    const validatedSignals = rawAISignalsSchema.parse(parsedJson);
    const durationMs = Date.now() - startTime;

    console.log(
      `[AI Qualification Extractor] Extracted signals using ${modelName} in ${durationMs}ms`,
    );

    return {
      signals: validatedSignals,
      model: modelName,
      durationMs,
    };
  } catch (err: unknown) {
    if (err instanceof AppError) {
      throw err;
    }

    console.error("[AI Qualification Extractor] Extraction failed:", err);
    throw new AppError(
      "AI_EXTRACTION_FAILED",
      err instanceof Error
        ? `AI extraction failed: ${err.message}`
        : "Failed to extract qualification signals from conversation.",
      500,
    );
  }
}
