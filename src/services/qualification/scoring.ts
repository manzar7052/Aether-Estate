import * as rules from "./rules";
import type {
  ScoringLeadInput,
  QualificationResult,
  ScoreBreakdown,
  QualificationCategory,
} from "./types";

/**
 * Pure, deterministic Lead Qualification Scoring Engine.
 * Zero external dependencies, zero side-effects, 100% reproducible and unit-testable.
 */
export function calculateQualificationScore(
  input: ScoringLeadInput,
): QualificationResult {
  const reasons: string[] = [];

  // =========================================================================
  // 1. BUDGET SCORING (0–30 Points)
  // =========================================================================
  let budgetScore = 0;
  const rawMin = input.budget_min;
  const rawMax = input.budget_max;

  const hasValidMax =
    typeof rawMax === "number" && !isNaN(rawMax) && rawMax > 0;
  const hasValidMin =
    typeof rawMin === "number" && !isNaN(rawMin) && rawMin > 0;

  if (hasValidMax && hasValidMin && rawMax >= rawMin) {
    budgetScore = rules.SCORE_WEIGHTS.BUDGET_MAX; // 30 pts
    reasons.push(
      `Structured budget range defined ($${rawMin.toLocaleString()} – $${rawMax.toLocaleString()})`,
    );
  } else if (hasValidMax) {
    budgetScore = 20; // 20 pts
    reasons.push(`Maximum budget defined ($${rawMax.toLocaleString()})`);
  } else if (hasValidMin) {
    budgetScore = 10; // 10 pts
    reasons.push(`Minimum budget expressed ($${rawMin.toLocaleString()})`);
  } else {
    budgetScore = 0;
    reasons.push("No usable budget provided");
  }

  budgetScore = Math.min(
    rules.SCORE_WEIGHTS.BUDGET_MAX,
    Math.max(0, budgetScore),
  );

  // =========================================================================
  // 2. TIMELINE SCORING (0–30 Points)
  // =========================================================================
  let timelineScore = 0;
  const rawTimeline = input.timeline?.trim().toLowerCase();

  if (rawTimeline && rawTimeline in rules.TIMELINE_SCORES) {
    timelineScore = rules.TIMELINE_SCORES[rawTimeline];
    if (rawTimeline === "immediate" || rawTimeline === "within_30_days") {
      reasons.push(
        `High urgency purchase timeline (${rawTimeline.replace(/_/g, " ")})`,
      );
    } else if (rawTimeline === "1_3_months") {
      reasons.push("Medium urgency purchase timeline (1–3 months)");
    } else if (rawTimeline === "3_6_months" || rawTimeline === "6_plus_months") {
      reasons.push(`Extended planning timeline (${rawTimeline.replace(/_/g, " ")})`);
    } else {
      reasons.push("Purchase timeline is unspecified or unknown");
    }
  } else {
    timelineScore = 0;
    reasons.push("Purchase timeline is unspecified or unknown");
  }

  timelineScore = Math.min(
    rules.SCORE_WEIGHTS.TIMELINE_MAX,
    Math.max(0, timelineScore),
  );

  // =========================================================================
  // 3. ENGAGEMENT SCORING (0–20 Points)
  // =========================================================================
  let rawEngagementScore = 0;
  const eng = input.engagement || {};

  if (eng.isContactConfirmed) {
    rawEngagementScore += rules.ENGAGEMENT_WEIGHTS.CONTACT_CONFIRMED; // 8 pts
    reasons.push("Visitor explicitly confirmed advisor contact consent");
  }

  const msgCount = eng.userMessageCount || 0;
  if (msgCount >= 5) {
    rawEngagementScore +=
      rules.ENGAGEMENT_WEIGHTS.MESSAGES_3_PLUS +
      rules.ENGAGEMENT_WEIGHTS.MESSAGES_5_PLUS_BONUS; // 4 + 3 = 7 pts
    reasons.push(`Active conversational engagement (${msgCount} messages)`);
  } else if (msgCount >= 3) {
    rawEngagementScore += rules.ENGAGEMENT_WEIGHTS.MESSAGES_3_PLUS; // 4 pts
    reasons.push(`Engaged conversation (${msgCount} messages)`);
  }

  if (eng.hasPropertySearch) {
    rawEngagementScore += rules.ENGAGEMENT_WEIGHTS.PROPERTY_SEARCH; // 3 pts
    reasons.push("Actively searched portfolio properties");
  }

  if (eng.hasPropertyView || input.property_id) {
    rawEngagementScore += rules.ENGAGEMENT_WEIGHTS.PROPERTY_VIEW; // 2 pts
    reasons.push("Inquired regarding a specific portfolio listing");
  }

  const engagementScore = Math.min(
    rules.SCORE_WEIGHTS.ENGAGEMENT_MAX,
    Math.max(0, rawEngagementScore),
  );

  // =========================================================================
  // 4. PROPERTY FIT / REQUIREMENT COMPLETENESS (0–20 Points)
  // =========================================================================
  let rawFitScore = 0;

  if (input.city && input.city.trim().length > 0) {
    rawFitScore += rules.PROPERTY_FIT_WEIGHTS.LOCATION; // 7 pts
    reasons.push(`Target location specified (${input.city.trim()})`);
  }

  if (input.property_type && input.property_type.trim().length > 0) {
    rawFitScore += rules.PROPERTY_FIT_WEIGHTS.PROPERTY_TYPE; // 4 pts
    reasons.push(`Preferred property type specified (${input.property_type.trim()})`);
  }

  if (
    typeof input.bedrooms === "number" &&
    !isNaN(input.bedrooms) &&
    input.bedrooms > 0
  ) {
    rawFitScore += rules.PROPERTY_FIT_WEIGHTS.BEDROOMS; // 3 pts
    reasons.push(`Bedrooms requirement specified (${input.bedrooms} beds)`);
  }

  if (hasValidMax || hasValidMin) {
    rawFitScore += rules.PROPERTY_FIT_WEIGHTS.BUDGET; // 3 pts
  }

  if (rawTimeline && rawTimeline !== "unknown") {
    rawFitScore += rules.PROPERTY_FIT_WEIGHTS.TIMELINE; // 3 pts
  }

  const propertyFitScore = Math.min(
    rules.SCORE_WEIGHTS.PROPERTY_FIT_MAX,
    Math.max(0, rawFitScore),
  );

  // =========================================================================
  // 5. TOTAL SCORE & QUALIFICATION CATEGORY
  // =========================================================================
  const totalScore = Math.min(
    rules.SCORE_WEIGHTS.TOTAL_MAX,
    Math.max(
      0,
      budgetScore + timelineScore + engagementScore + propertyFitScore,
    ),
  );

  let category: QualificationCategory = "cold";
  if (totalScore >= rules.CATEGORY_THRESHOLDS.HOT_MIN) {
    category = "hot";
  } else if (totalScore >= rules.CATEGORY_THRESHOLDS.WARM_MIN) {
    category = "warm";
  } else {
    category = "cold";
  }

  const breakdown: ScoreBreakdown = {
    budget: budgetScore,
    timeline: timelineScore,
    engagement: engagementScore,
    propertyFit: propertyFitScore,
  };

  return {
    totalScore,
    category,
    breakdown,
    reasons,
  };
}
