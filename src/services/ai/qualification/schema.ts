import { z } from "zod";
import type { PropertyType } from "@/types/database";

const confidenceSchema = z
  .number()
  .min(0, "Confidence must be >= 0.0")
  .max(1, "Confidence must be <= 1.0");

export const aiExtractedBudgetSchema = z.object({
  min: z.number().nullable().optional(),
  max: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  confidence: confidenceSchema,
  evidence: z.array(z.string()).default([]),
});

export const aiExtractedTimelineSchema = z.object({
  value: z
    .enum([
      "immediate",
      "within_30_days",
      "1_3_months",
      "3_6_months",
      "6_plus_months",
      "unknown",
    ])
    .nullable()
    .optional(),
  confidence: confidenceSchema,
  evidence: z.array(z.string()).default([]),
});

export const aiExtractedPropertyFitSchema = z.object({
  location: z.string().nullable().optional(),
  propertyType: z
    .enum([
      "house",
      "apartment",
      "condo",
      "townhouse",
      "land",
      "commercial",
    ])
    .nullable()
    .optional(),
  bedrooms: z.number().nullable().optional(),
  confidence: confidenceSchema,
  evidence: z.array(z.string()).default([]),
});

export const aiExtractedIntentSchema = z.object({
  level: z.enum(["low", "medium", "high"]),
  confidence: confidenceSchema,
  evidence: z.array(z.string()).default([]),
});

export const rawAISignalsSchema = z
  .object({
    budget: aiExtractedBudgetSchema.nullable().optional(),
    timeline: aiExtractedTimelineSchema.nullable().optional(),
    propertyFit: aiExtractedPropertyFitSchema.nullable().optional(),
    intent: aiExtractedIntentSchema.nullable().optional(),
    missingInformation: z.array(z.string()).default([]),
    // If Gemini attempts returning scores or categories, explicitly ignore/strip them
    score: z.unknown().optional(),
    qualification_score: z.unknown().optional(),
    category: z.unknown().optional(),
    qualification_category: z.unknown().optional(),
  })
  .transform((data) => ({
    budget: data.budget || null,
    timeline: data.timeline || null,
    propertyFit: data.propertyFit || null,
    intent: data.intent || null,
    missingInformation: data.missingInformation || [],
  }));

export type AIExtractedBudget = z.infer<typeof aiExtractedBudgetSchema>;
export type AIExtractedTimeline = z.infer<typeof aiExtractedTimelineSchema>;
export type AIExtractedPropertyFit = {
  location?: string | null;
  propertyType?: PropertyType | null;
  bedrooms?: number | null;
  confidence: number;
  evidence: string[];
};
export type AIExtractedIntent = z.infer<typeof aiExtractedIntentSchema>;
export type AIQualificationSignals = z.infer<typeof rawAISignalsSchema>;
