import type { Lead, PropertyType } from "@/types/database";
import type { AIQualificationSignals } from "./schema";
import type { ScoringLeadInput } from "@/services/qualification/types";

export interface QualificationConflict {
  field: "budget" | "timeline" | "city" | "property_type" | "bedrooms";
  existingValue: string | number | null;
  suggestedValue: string | number | null;
  confidence: number;
  evidence: string[];
  description: string;
}

export interface SuggestedEnrichments {
  budget_min?: number | null;
  budget_max?: number | null;
  timeline?: string | null;
  city?: string | null;
  property_type?: PropertyType | null;
  bedrooms?: number | null;
}

export interface MergeEvaluationResult {
  conflicts: QualificationConflict[];
  suggestedEnrichments: SuggestedEnrichments;
  hasConflicts: boolean;
  hasEnrichments: boolean;
}

/**
 * Detects conflicts between authoritative existing lead records and AI suggestions.
 * Follows strict precedence: User explicitly provided data > Existing lead fields > AI extraction.
 */
export function evaluateSignalsAndConflicts(
  lead: Lead,
  signals: AIQualificationSignals,
): MergeEvaluationResult {
  const conflicts: QualificationConflict[] = [];
  const suggestedEnrichments: SuggestedEnrichments = {};

  // 1. Budget Evaluation
  if (signals.budget && signals.budget.confidence >= 0.6) {
    const aiMax = signals.budget.max ?? null;
    const existingMax = lead.budget_max ?? null;

    if (existingMax !== null && aiMax !== null && existingMax !== aiMax) {
      conflicts.push({
        field: "budget",
        existingValue: existingMax,
        suggestedValue: aiMax,
        confidence: signals.budget.confidence,
        evidence: signals.budget.evidence,
        description: `Lead record has max budget $${existingMax.toLocaleString()}, but AI detected $${aiMax.toLocaleString()}`,
      });
    } else if (existingMax === null && aiMax !== null) {
      suggestedEnrichments.budget_max = aiMax;
      if (signals.budget.min) {
        suggestedEnrichments.budget_min = signals.budget.min;
      }
    }
  }

  // 2. Timeline Evaluation
  if (
    signals.timeline &&
    signals.timeline.value &&
    signals.timeline.value !== "unknown" &&
    signals.timeline.confidence >= 0.6
  ) {
    const aiTimeline = signals.timeline.value;
    const existingTimeline = lead.timeline || null;

    if (
      existingTimeline !== null &&
      existingTimeline !== "unknown" &&
      existingTimeline !== aiTimeline
    ) {
      conflicts.push({
        field: "timeline",
        existingValue: existingTimeline,
        suggestedValue: aiTimeline,
        confidence: signals.timeline.confidence,
        evidence: signals.timeline.evidence,
        description: `Lead record timeline is "${existingTimeline.replace(/_/g, " ")}", but AI detected "${aiTimeline.replace(/_/g, " ")}"`,
      });
    } else if (!existingTimeline || existingTimeline === "unknown") {
      suggestedEnrichments.timeline = aiTimeline;
    }
  }

  // 3. Location / City Evaluation
  if (
    signals.propertyFit &&
    signals.propertyFit.location &&
    signals.propertyFit.confidence >= 0.6
  ) {
    const aiLocation = signals.propertyFit.location.trim();
    const existingCity = lead.city ? lead.city.trim() : null;

    if (
      existingCity &&
      aiLocation.toLowerCase() !== existingCity.toLowerCase()
    ) {
      conflicts.push({
        field: "city",
        existingValue: existingCity,
        suggestedValue: aiLocation,
        confidence: signals.propertyFit.confidence,
        evidence: signals.propertyFit.evidence,
        description: `Lead record city is "${existingCity}", but AI detected "${aiLocation}"`,
      });
    } else if (!existingCity) {
      suggestedEnrichments.city = aiLocation;
    }
  }

  // 4. Property Type Evaluation
  if (
    signals.propertyFit &&
    signals.propertyFit.propertyType &&
    signals.propertyFit.confidence >= 0.6
  ) {
    const aiType = signals.propertyFit.propertyType;
    const existingType = lead.property_type || null;

    if (existingType && existingType !== aiType) {
      conflicts.push({
        field: "property_type",
        existingValue: existingType,
        suggestedValue: aiType,
        confidence: signals.propertyFit.confidence,
        evidence: signals.propertyFit.evidence,
        description: `Lead record property type is "${existingType}", but AI detected "${aiType}"`,
      });
    } else if (!existingType) {
      suggestedEnrichments.property_type = aiType;
    }
  }

  // 5. Bedrooms Evaluation
  if (
    signals.propertyFit &&
    typeof signals.propertyFit.bedrooms === "number" &&
    signals.propertyFit.confidence >= 0.6
  ) {
    const aiBeds = signals.propertyFit.bedrooms;
    const existingBeds = lead.bedrooms || null;

    if (existingBeds !== null && existingBeds !== aiBeds) {
      conflicts.push({
        field: "bedrooms",
        existingValue: existingBeds,
        suggestedValue: aiBeds,
        confidence: signals.propertyFit.confidence,
        evidence: signals.propertyFit.evidence,
        description: `Lead record specifies ${existingBeds} beds, but AI detected ${aiBeds} beds`,
      });
    } else if (existingBeds === null) {
      suggestedEnrichments.bedrooms = aiBeds;
    }
  }

  return {
    conflicts,
    suggestedEnrichments,
    hasConflicts: conflicts.length > 0,
    hasEnrichments: Object.keys(suggestedEnrichments).length > 0,
  };
}

/**
 * Builds merged scoring input incorporating non-conflicting enrichments.
 */
export function buildMergedScoringInput(
  lead: Lead,
  enrichments: SuggestedEnrichments,
): ScoringLeadInput {
  return {
    budget_min: lead.budget_min ?? enrichments.budget_min ?? null,
    budget_max: lead.budget_max ?? enrichments.budget_max ?? null,
    timeline: lead.timeline ?? enrichments.timeline ?? null,
    city: lead.city ?? enrichments.city ?? null,
    property_type: lead.property_type ?? enrichments.property_type ?? null,
    bedrooms: lead.bedrooms ?? enrichments.bedrooms ?? null,
    property_id: lead.property_id,
  };
}
