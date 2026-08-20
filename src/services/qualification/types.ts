import type { PropertyType } from "@/types/database";

export type QualificationCategory = "hot" | "warm" | "cold";

export interface ScoreBreakdown {
  budget: number;
  timeline: number;
  engagement: number;
  propertyFit: number;
}

export interface QualificationResult {
  totalScore: number;
  category: QualificationCategory;
  breakdown: ScoreBreakdown;
  reasons: string[];
}

export interface EngagementSignals {
  conversationExists?: boolean;
  userMessageCount?: number;
  hasPropertySearch?: boolean;
  hasPropertyView?: boolean;
  isContactConfirmed?: boolean;
}

export interface ScoringLeadInput {
  budget_min?: number | null;
  budget_max?: number | null;
  timeline?: string | null;
  city?: string | null;
  property_type?: PropertyType | string | null;
  bedrooms?: number | null;
  property_id?: string | null;
  engagement?: EngagementSignals;
}
