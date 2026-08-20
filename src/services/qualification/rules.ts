/**
 * Centralized rule weights and threshold configuration for the Aether Estates Lead Qualification Engine.
 * Single source of truth for all qualification scoring metrics.
 */

export const SCORE_WEIGHTS = {
  BUDGET_MAX: 30,
  TIMELINE_MAX: 30,
  ENGAGEMENT_MAX: 20,
  PROPERTY_FIT_MAX: 20,
  TOTAL_MAX: 100,
} as const;

export const TIMELINE_SCORES: Record<string, number> = {
  immediate: 30,
  within_30_days: 30,
  "1_3_months": 25,
  "3_6_months": 15,
  "6_plus_months": 5,
  unknown: 0,
};

export const CATEGORY_THRESHOLDS = {
  HOT_MIN: 80,
  WARM_MIN: 50,
} as const;

export const ENGAGEMENT_WEIGHTS = {
  CONTACT_CONFIRMED: 8,
  MESSAGES_3_PLUS: 4,
  MESSAGES_5_PLUS_BONUS: 3,
  PROPERTY_SEARCH: 3,
  PROPERTY_VIEW: 2,
} as const;

export const PROPERTY_FIT_WEIGHTS = {
  LOCATION: 7,
  PROPERTY_TYPE: 4,
  BEDROOMS: 3,
  BUDGET: 3,
  TIMELINE: 3,
} as const;
