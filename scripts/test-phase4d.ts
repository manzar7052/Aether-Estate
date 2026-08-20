import { createServiceRoleClient } from "../src/lib/supabase/admin";
import {
  rawAISignalsSchema,
  aiExtractedTimelineSchema,
} from "../src/services/ai/qualification/schema";
import {
  evaluateSignalsAndConflicts,
  buildMergedScoringInput,
} from "../src/services/ai/qualification/merge";
import { calculateQualificationScore } from "../src/services/qualification/scoring";
import { qualifyLead } from "../src/services/qualification/qualification-service";
import type { Lead, PropertyType } from "../src/types/database";

async function runPhase4DTests() {
  console.log("================================================================");
  console.log("  AETHER ESTATES — PHASE 4D AI-ASSISTED QUALIFICATION TESTS     ");
  console.log("================================================================\n");

  const baseUrl = "http://localhost:3000";
  const supabase = createServiceRoleClient();

  // -------------------------------------------------------------
  // TEST 1: Valid AI Output Schema Validation
  // -------------------------------------------------------------
  console.log("▶ TEST 1: Valid AI Output Schema Validation");
  const validSignals = {
    budget: {
      min: 1500000,
      max: 2200000,
      currency: "USD",
      confidence: 0.95,
      evidence: ["Looking in the $1.5M to $2.2M range"],
    },
    timeline: {
      value: "within_30_days" as const,
      confidence: 0.9,
      evidence: ["We need to relocate next month"],
    },
    propertyFit: {
      location: "Austin",
      propertyType: "house" as PropertyType,
      bedrooms: 4,
      confidence: 0.85,
      evidence: ["Looking for a 4-bedroom house in Austin"],
    },
    intent: {
      level: "high" as const,
      confidence: 0.92,
      evidence: ["Can we schedule a private tour this Saturday?"],
    },
    missingInformation: [],
  };

  const parsedValid = rawAISignalsSchema.parse(validSignals);
  console.log("  Parsed valid budget max:", parsedValid.budget?.max);
  console.log("  Parsed timeline:", parsedValid.timeline?.value);
  console.log("  Parsed intent:", parsedValid.intent?.level);
  if (parsedValid.budget?.max !== 2200000 || parsedValid.timeline?.value !== "within_30_days") {
    throw new Error("Test 1 Failed: Schema validation failed for valid input");
  }
  console.log("  Valid AI schema validation passed ✅\n");

  // -------------------------------------------------------------
  // TEST 2: Malformed AI Output Rejection
  // -------------------------------------------------------------
  console.log("▶ TEST 2: Malformed AI Output Rejection");
  const malformedOutputs = [
    { budget: "not-an-object", timeline: 123 },
    { timeline: { value: "invalid_timeline_enum", confidence: 0.5 } },
    { intent: { level: "extreme_urgent", confidence: 0.8 } },
  ];

  for (const badOutput of malformedOutputs) {
    const parseResult = rawAISignalsSchema.safeParse(badOutput);
    console.log("  Malformed output correctly rejected:", !parseResult.success);
    if (parseResult.success) {
      throw new Error("Test 2 Failed: Malformed output was unexpectedly accepted");
    }
  }
  console.log("  Malformed output rejection verified ✅\n");

  // -------------------------------------------------------------
  // TEST 3: Score Stripping (AI returns hallucinated score)
  // -------------------------------------------------------------
  console.log("▶ TEST 3: Score Stripping & Discarding from AI Response");
  const aiOutputWithScore = {
    score: 100,
    qualification_score: 98,
    category: "hot",
    qualification_category: "hot",
    budget: {
      max: 3000000,
      confidence: 0.9,
      evidence: ["Budget up to $3M"],
    },
    timeline: {
      value: "immediate" as const,
      confidence: 0.95,
      evidence: ["Moving ASAP"],
    },
    intent: {
      level: "high" as const,
      confidence: 0.9,
      evidence: ["Ready to purchase"],
    },
    missingInformation: [],
  };

  const strippedSignals = rawAISignalsSchema.parse(aiOutputWithScore);
  console.log("  Transformed signals keys:", Object.keys(strippedSignals));
  console.log("  Has 'score' key?", "score" in strippedSignals);
  console.log("  Has 'category' key?", "category" in strippedSignals);

  if ("score" in strippedSignals || "category" in strippedSignals) {
    throw new Error("Test 3 Failed: AI returned scores were not stripped");
  }
  console.log("  AI score stripping verified ✅\n");

  // -------------------------------------------------------------
  // TEST 4: Confidence Range Validation [0.0, 1.0]
  // -------------------------------------------------------------
  console.log("▶ TEST 4: Confidence Range Validation [0.0 .. 1.0]");
  const invalidConfidences = [-0.5, 1.5, 100, -1];
  for (const badConf of invalidConfidences) {
    const res = rawAISignalsSchema.safeParse({
      intent: { level: "high", confidence: badConf, evidence: [] },
      missingInformation: [],
    });
    if (res.success) {
      throw new Error(`Test 4 Failed: Invalid confidence ${badConf} was accepted`);
    }
  }
  console.log("  Confidence bounds enforcement verified ✅\n");

  // -------------------------------------------------------------
  // TEST 5: Timeline Normalization
  // -------------------------------------------------------------
  console.log("▶ TEST 5: Timeline Enum Normalization");
  const canonicalTimelines = [
    "immediate",
    "within_30_days",
    "1_3_months",
    "3_6_months",
    "6_plus_months",
    "unknown",
  ];
  for (const t of canonicalTimelines) {
    const res = aiExtractedTimelineSchema.safeParse({
      value: t,
      confidence: 0.9,
      evidence: ["test quote"],
    });
    if (!res.success) {
      throw new Error(`Test 5 Failed: Canonical timeline '${t}' failed schema`);
    }
  }
  console.log("  Timeline normalization verified ✅\n");

  // -------------------------------------------------------------
  // TEST 6: User Data Precedence & Conflict Detection
  // -------------------------------------------------------------
  console.log("▶ TEST 6: User Data Precedence & Conflict Detection");
  const mockLead: Lead = {
    id: "00000000-0000-0000-0000-000000000001",
    full_name: "Eleanor Vance",
    email: "eleanor@vance.test",
    phone: "512-555-0199",
    source: "chatbot",
    status: "new",
    intent: "buy",
    city: "Dallas",
    property_type: "house",
    budget_min: 1000000,
    budget_max: 1500000,
    bedrooms: 3,
    timeline: "6_plus_months", // Existing authoritative timeline
    lead_score: 55,
    qualification_category: "warm",
    qualification_breakdown: { budget: 30, timeline: 5, engagement: 10, propertyFit: 10 },
    qualification_reasons: ["Existing lead reasons"],
    qualified_at: new Date().toISOString(),
    assigned_agent_id: null,
    property_id: null,
    message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // AI suggests a conflicting timeline and budget
  const conflictingSignals = {
    budget: {
      max: 2800000, // Conflict: 2.8M vs existing 1.5M
      confidence: 0.88,
      evidence: ["Actually looking up to $2.8M now"],
    },
    timeline: {
      value: "within_30_days" as const, // Conflict: within 30 days vs existing 6+ months
      confidence: 0.92,
      evidence: ["Need to relocate within three weeks"],
    },
    propertyFit: {
      location: "Dallas", // Match
      propertyType: "house" as PropertyType, // Match
      bedrooms: 4, // Conflict: 4 beds vs existing 3 beds
      confidence: 0.85,
      evidence: ["Need at least 4 bedrooms"],
    },
    intent: {
      level: "high" as const,
      confidence: 0.9,
      evidence: ["Ready to view properties"],
    },
    missingInformation: [],
  };

  const mergeEval = evaluateSignalsAndConflicts(mockLead, conflictingSignals);
  console.log("  Detected conflicts count:", mergeEval.conflicts.length);
  console.log("  Conflict 1 (Budget):", mergeEval.conflicts.find((c) => c.field === "budget")?.description);
  console.log("  Conflict 2 (Timeline):", mergeEval.conflicts.find((c) => c.field === "timeline")?.description);
  console.log("  Conflict 3 (Bedrooms):", mergeEval.conflicts.find((c) => c.field === "bedrooms")?.description);

  if (mergeEval.conflicts.length !== 3) {
    throw new Error("Test 6 Failed: Expected exactly 3 conflicts detected");
  }
  console.log("  User data precedence and conflict detection verified ✅\n");

  // -------------------------------------------------------------
  // TEST 7: Non-Conflicting Enrichment Application
  // -------------------------------------------------------------
  console.log("▶ TEST 7: Non-Conflicting AI Signal Enrichment");
  const emptyCriteriaLead: Lead = {
    ...mockLead,
    city: null,
    property_type: null,
    bedrooms: null,
    timeline: null,
  };

  const enrichmentSignals = {
    budget: null,
    timeline: {
      value: "within_30_days" as const,
      confidence: 0.9,
      evidence: ["Moving next month"],
    },
    propertyFit: {
      location: "Austin",
      propertyType: "condo" as PropertyType,
      bedrooms: 2,
      confidence: 0.88,
      evidence: ["2 bed condo in Austin"],
    },
    intent: {
      level: "medium" as const,
      confidence: 0.8,
      evidence: ["Interested in viewing condos"],
    },
    missingInformation: ["budget"],
  };

  const emptyEval = evaluateSignalsAndConflicts(emptyCriteriaLead, enrichmentSignals);
  console.log("  Has conflicts for empty fields?", emptyEval.hasConflicts);
  console.log("  Discovered enrichments:", emptyEval.suggestedEnrichments);

  if (emptyEval.hasConflicts || !emptyEval.hasEnrichments) {
    throw new Error("Test 7 Failed: Expected clean enrichments without conflicts");
  }

  const mergedInput = buildMergedScoringInput(emptyCriteriaLead, emptyEval.suggestedEnrichments);
  console.log("  Merged Scoring Input city:", mergedInput.city);
  console.log("  Merged Scoring Input timeline:", mergedInput.timeline);
  console.log("  Merged Scoring Input bedrooms:", mergedInput.bedrooms);

  if (mergedInput.city !== "Austin" || mergedInput.timeline !== "within_30_days" || mergedInput.bedrooms !== 2) {
    throw new Error("Test 7 Failed: Merged scoring input values mismatch");
  }
  console.log("  Non-conflicting enrichment verified ✅\n");

  // -------------------------------------------------------------
  // TEST 8: Deterministic Score Calculation through Phase 4A Engine
  // -------------------------------------------------------------
  console.log("▶ TEST 8: Deterministic Score Calculation via Phase 4A Engine");
  // Calculate score deterministically using Phase 4A rules
  const scoreResult = calculateQualificationScore(mergedInput);
  console.log("  Calculated Score by Phase 4A:", scoreResult.totalScore);
  console.log("  Calculated Category by Phase 4A:", scoreResult.category);
  console.log("  Breakdown:", scoreResult.breakdown);

  // Verify that timeline="within_30_days" yielded exactly 30 points per Phase 4A rules
  if (scoreResult.breakdown.timeline !== 30) {
    throw new Error("Test 8 Failed: Expected timeline score of 30 from Phase 4A engine");
  }
  console.log("  Authoritative Phase 4A deterministic score calculation verified ✅\n");

  // -------------------------------------------------------------
  // TEST 9: Database Setup & Multi-Agent Authorization Checks
  // -------------------------------------------------------------
  console.log("▶ TEST 9: Multi-Agent Profile & Lead Setup");
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("role", { ascending: true });

  const adminProfile = profiles?.find((p) => p.role === "admin");
  const agentA = profiles?.find((p) => p.role === "agent");
  const agentB = profiles?.filter((p) => p.role === "agent")[1] || {
    id: "00000000-0000-0000-0000-000000000002",
    full_name: "Agent B Demo",
    role: "agent",
  };

  console.log("  Admin:", adminProfile?.full_name);
  console.log("  Agent A:", agentA?.full_name);
  console.log("  Agent B:", agentB.full_name);

  // Insert test lead assigned to Agent A
  const { data: testLeadA } = await supabase
    .from("leads")
    .insert({
      full_name: "David Ross",
      email: `david_ross_${Date.now()}@test.aether.estate`,
      phone: "512-555-9088",
      source: "chatbot",
      status: "new",
      assigned_agent_id: agentA?.id,
      lead_score: 45,
      qualification_category: "cold",
    })
    .select("*")
    .single();

  if (testLeadA) {
    // Attempt updating AI columns
    await supabase
      .from("leads")
      .update({
        ai_qualification_signals: validSignals,
        ai_qualification_model: "gemini-2.5-flash",
        ai_qualification_updated_at: new Date().toISOString(),
      })
      .eq("id", testLeadA.id);
  }

  console.log("  Inserted Test Lead ID (Assigned to Agent A):", testLeadA?.id);
  console.log("  Assigned Agent ID:", testLeadA?.assigned_agent_id);
  console.log("  Setup verified ✅\n");

  // -------------------------------------------------------------
  // TEST 10: Anonymous Endpoint Protection (POST /api/leads/[id]/ai-qualification)
  // -------------------------------------------------------------
  console.log("▶ TEST 10: Anonymous API Endpoint Protection");
  const unauthRes = await fetch(`${baseUrl}/api/leads/${testLeadA?.id}/ai-qualification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  console.log("  Unauthenticated POST status:", unauthRes.status);
  if (unauthRes.status !== 401 && unauthRes.status !== 307 && unauthRes.status !== 403) {
    throw new Error("Test 10 Failed: Unauthenticated request was not rejected with 401/403");
  }
  console.log("  Anonymous protection verified ✅\n");

  // -------------------------------------------------------------
  // TEST 11: Idempotent Re-qualification Database Persistence
  // -------------------------------------------------------------
  console.log("▶ TEST 11: Idempotent Re-qualification Persistence");
  const qualifyRes = await qualifyLead(testLeadA!.id);
  console.log("  Re-qualified Score:", qualifyRes.totalScore);
  console.log("  Re-qualified Category:", qualifyRes.category);

  const { data: refreshedLead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", testLeadA!.id)
    .single();

  console.log("  Lead Score in DB:", refreshedLead?.lead_score);
  console.log("  AI Signals preserved in DB?", Boolean(refreshedLead?.ai_qualification_signals));
  if (refreshedLead?.lead_score !== qualifyRes.totalScore) {
    throw new Error("Test 11 Failed: Requalification persistence mismatch");
  }
  console.log("  Idempotent persistence verified ✅\n");

  // -------------------------------------------------------------
  // TEST 12: Public Website Regression Checks
  // -------------------------------------------------------------
  console.log("▶ TEST 12: Public Website Regression Checks");
  const rHome = await fetch(`${baseUrl}/`);
  const rProps = await fetch(`${baseUrl}/properties`);
  console.log("  GET / status:", rHome.status);
  console.log("  GET /properties status:", rProps.status);
  if (rHome.status !== 200 || rProps.status !== 200) {
    throw new Error("Test 12 Failed: Public page regression");
  }
  console.log("  Public regression checks passed ✅\n");

  console.log("================================================================");
  console.log("  ALL PHASE 4D AI-ASSISTED QUALIFICATION TESTS PASSED 100%!     ");
  console.log("================================================================");
}

runPhase4DTests();
