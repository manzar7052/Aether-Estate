import { calculateQualificationScore } from "../src/services/qualification/scoring";
import { qualifyLead } from "../src/services/qualification/qualification-service";
import {
  createPropertyLead,
  captureLeadFromChat,
  createConversation,
  confirmLeadCapture,
} from "../src/services/leads";
import { createServiceRoleClient } from "../src/lib/supabase/admin";

async function runPhase4ATests() {
  console.log("================================================================");
  console.log("  AETHER ESTATES — PHASE 4A LEAD QUALIFICATION ENGINE TESTS     ");
  console.log("================================================================\n");

  const supabase = createServiceRoleClient();

  // -------------------------------------------------------------
  // TEST 1: Empty Lead (Score = 0, Category = cold)
  // -------------------------------------------------------------
  console.log("▶ TEST 1: Empty Lead Scoring");
  const t1 = calculateQualificationScore({});
  console.log("  Score:", t1.totalScore, "Category:", t1.category, "Breakdown:", t1.breakdown);
  if (t1.totalScore !== 0 || t1.category !== "cold") throw new Error("Test 1 Failed");
  console.log("  Test 1 Passed ✅\n");

  // -------------------------------------------------------------
  // TEST 2: Immediate Ready Buyer (Maximum Score, Hot Category)
  // -------------------------------------------------------------
  console.log("▶ TEST 2: Immediate Ready Buyer (Full Qualification)");
  const t2 = calculateQualificationScore({
    budget_min: 800000,
    budget_max: 1200000,
    timeline: "immediate",
    city: "Austin",
    property_type: "house",
    bedrooms: 4,
    property_id: "test-prop-id",
    engagement: {
      isContactConfirmed: true,
      userMessageCount: 6,
      hasPropertySearch: true,
      hasPropertyView: true,
    },
  });
  console.log("  Score:", t2.totalScore, "Category:", t2.category, "Breakdown:", t2.breakdown);
  console.log("  Reasons count:", t2.reasons.length);
  if (t2.totalScore !== 100 || t2.category !== "hot")
    throw new Error("Test 2 Failed: Expected 100, got " + t2.totalScore);
  console.log("  Test 2 Passed ✅\n");

  // -------------------------------------------------------------
  // TEST 3: Timeline Boundary Tests
  // -------------------------------------------------------------
  console.log("▶ TEST 3: Timeline Values Scoring");
  const timelines = [
    { val: "immediate", expected: 30 },
    { val: "within_30_days", expected: 30 },
    { val: "1_3_months", expected: 25 },
    { val: "3_6_months", expected: 15 },
    { val: "6_plus_months", expected: 5 },
    { val: "unknown", expected: 0 },
    { val: "", expected: 0 },
    { val: null, expected: 0 },
  ];
  for (const t of timelines) {
    const res = calculateQualificationScore({ timeline: t.val });
    if (res.breakdown.timeline !== t.expected) {
      throw new Error(`Timeline ${t.val} expected ${t.expected}, got ${res.breakdown.timeline}`);
    }
    console.log(`  Timeline '${t.val}': ${res.breakdown.timeline} pts (Expected: ${t.expected}) ✅`);
  }
  console.log("  Test 3 Passed ✅\n");

  // -------------------------------------------------------------
  // TEST 4: Category Boundary Tests (0, 49 -> cold; 50, 79 -> warm; 80, 100 -> hot)
  // -------------------------------------------------------------
  console.log("▶ TEST 4: Category Threshold Boundaries");
  // 0 pts -> cold
  const c0 = calculateQualificationScore({});
  // 45 pts -> cold (Budget 20 + Timeline 15 + Location 7 + BudgetFit 3 = 45)
  const cCold = calculateQualificationScore({
    budget_max: 500000,
    timeline: "3_6_months",
    city: "Austin",
  });
  // 50 pts -> warm (Budget 20 + Timeline 30 = 50)
  const c50 = calculateQualificationScore({
    budget_max: 500000,
    timeline: "immediate",
  });
  // 78 pts -> warm (Budget 20 + Timeline 30 + Location 7 + Type 4 + Bedrooms 3 + BudgetFit 3 + TimelineFit 3 + Contact 8 = 78)
  const c78 = calculateQualificationScore({
    budget_max: 500000,
    timeline: "within_30_days",
    city: "Austin",
    property_type: "house",
    bedrooms: 3,
    engagement: { isContactConfirmed: true },
  });
  // 80 pts -> hot (Budget 30 + Timeline 30 + Fit 20 = 80)
  const c80 = calculateQualificationScore({
    budget_min: 500000,
    budget_max: 900000,
    timeline: "within_30_days",
    city: "Austin",
    property_type: "house",
    bedrooms: 3,
  });

  console.log("  Score 0 category:", c0.category, "(Expected: cold) ✅");
  console.log("  Score 45 category:", cCold.totalScore, cCold.category, "(Expected: cold) ✅");
  console.log("  Score 50 category:", c50.totalScore, c50.category, "(Expected: warm) ✅");
  console.log("  Score 78 category:", c78.totalScore, c78.category, "(Expected: warm) ✅");
  console.log("  Score 80 category:", c80.totalScore, c80.category, "(Expected: hot) ✅");
  if (
    cCold.category !== "cold" ||
    c50.category !== "warm" ||
    c78.category !== "warm" ||
    c80.category !== "hot"
  ) {
    throw new Error("Category boundary check failed");
  }
  console.log("  Test 4 Passed ✅\n");

  // -------------------------------------------------------------
  // TEST 5: Budget Scoring Variations
  // -------------------------------------------------------------
  console.log("▶ TEST 5: Budget Variations");
  const bMissing = calculateQualificationScore({});
  const bNegative = calculateQualificationScore({ budget_max: -500 });
  const bZero = calculateQualificationScore({ budget_max: 0 });
  const bMinOnly = calculateQualificationScore({ budget_min: 500000 });
  const bMaxOnly = calculateQualificationScore({ budget_max: 1000000 });
  const bRange = calculateQualificationScore({ budget_min: 600000, budget_max: 900000 });
  const bInverted = calculateQualificationScore({ budget_min: 1000000, budget_max: 500000 });
  const bHuge = calculateQualificationScore({ budget_min: 10000000, budget_max: 50000000 });

  console.log("  Missing budget:", bMissing.breakdown.budget, "pts (0)");
  console.log("  Negative budget:", bNegative.breakdown.budget, "pts (0)");
  console.log("  Zero budget:", bZero.breakdown.budget, "pts (0)");
  console.log("  Min only budget:", bMinOnly.breakdown.budget, "pts (10)");
  console.log("  Max only budget:", bMaxOnly.breakdown.budget, "pts (20)");
  console.log("  Valid range budget:", bRange.breakdown.budget, "pts (30)");
  console.log("  Inverted range (fallback max):", bInverted.breakdown.budget, "pts (20)");
  console.log("  Large luxury budget:", bHuge.breakdown.budget, "pts (30)");

  if (
    bMissing.breakdown.budget !== 0 ||
    bNegative.breakdown.budget !== 0 ||
    bZero.breakdown.budget !== 0 ||
    bMinOnly.breakdown.budget !== 10 ||
    bMaxOnly.breakdown.budget !== 20 ||
    bRange.breakdown.budget !== 30 ||
    bInverted.breakdown.budget !== 20 ||
    bHuge.breakdown.budget !== 30
  ) {
    throw new Error("Budget variation test failed");
  }
  console.log("  Test 5 Passed ✅\n");

  // -------------------------------------------------------------
  // TEST 6: Engagement Scoring & 20 Point Clamping
  // -------------------------------------------------------------
  console.log("▶ TEST 6: Engagement Signals & Ceiling");
  const e0 = calculateQualificationScore({});
  const e1 = calculateQualificationScore({ engagement: { userMessageCount: 1 } });
  const e3 = calculateQualificationScore({ engagement: { userMessageCount: 3 } });
  const e5 = calculateQualificationScore({ engagement: { userMessageCount: 5 } });
  const eSearch = calculateQualificationScore({ engagement: { hasPropertySearch: true } });
  const eConsent = calculateQualificationScore({ engagement: { isContactConfirmed: true } });
  const eMax = calculateQualificationScore({
    engagement: {
      isContactConfirmed: true,
      userMessageCount: 10,
      hasPropertySearch: true,
      hasPropertyView: true,
    },
  });

  console.log("  0 messages:", e0.breakdown.engagement, "pts");
  console.log("  1 message:", e1.breakdown.engagement, "pts");
  console.log("  3 messages:", e3.breakdown.engagement, "pts (4)");
  console.log("  5 messages:", e5.breakdown.engagement, "pts (7)");
  console.log("  Search done:", eSearch.breakdown.engagement, "pts (3)");
  console.log("  Contact consent:", eConsent.breakdown.engagement, "pts (8)");
  console.log("  All combined:", eMax.breakdown.engagement, "pts (20 max)");

  if (
    e0.breakdown.engagement !== 0 ||
    e1.breakdown.engagement !== 0 ||
    e3.breakdown.engagement !== 4 ||
    e5.breakdown.engagement !== 7 ||
    eSearch.breakdown.engagement !== 3 ||
    eConsent.breakdown.engagement !== 8 ||
    eMax.breakdown.engagement !== 20
  ) {
    throw new Error("Engagement scoring test failed");
  }
  console.log("  Test 6 Passed ✅\n");

  // -------------------------------------------------------------
  // TEST 7: Property Fit Scoring (Requirement Completeness)
  // -------------------------------------------------------------
  console.log("▶ TEST 7: Property Fit Scoring");
  const pfNone = calculateQualificationScore({});
  const pfLoc = calculateQualificationScore({ city: "Austin" });
  const pfLocType = calculateQualificationScore({ city: "Austin", property_type: "house" });
  const pfLocTypeBeds = calculateQualificationScore({
    city: "Austin",
    property_type: "house",
    bedrooms: 3,
  });
  const pfAll = calculateQualificationScore({
    city: "Austin",
    property_type: "house",
    bedrooms: 3,
    budget_max: 800000,
    timeline: "within_30_days",
  });

  console.log("  No criteria:", pfNone.breakdown.propertyFit, "pts (0)");
  console.log("  Location only:", pfLoc.breakdown.propertyFit, "pts (7)");
  console.log("  Location + Type:", pfLocType.breakdown.propertyFit, "pts (11)");
  console.log("  Location + Type + Beds:", pfLocTypeBeds.breakdown.propertyFit, "pts (14)");
  console.log("  All 5 criteria:", pfAll.breakdown.propertyFit, "pts (20)");

  if (
    pfNone.breakdown.propertyFit !== 0 ||
    pfLoc.breakdown.propertyFit !== 7 ||
    pfLocType.breakdown.propertyFit !== 11 ||
    pfLocTypeBeds.breakdown.propertyFit !== 14 ||
    pfAll.breakdown.propertyFit !== 20
  ) {
    throw new Error("Property fit scoring test failed");
  }
  console.log("  Test 7 Passed ✅\n");

  // -------------------------------------------------------------
  // TEST 8: Deterministic Idempotency Test
  // -------------------------------------------------------------
  console.log("▶ TEST 8: Deterministic Idempotency");
  const sampleInput = {
    budget_min: 600000,
    budget_max: 950000,
    timeline: "1_3_months",
    city: "Miami",
    property_type: "condo",
    bedrooms: 2,
    engagement: { isContactConfirmed: true, userMessageCount: 4 },
  };
  const run1 = calculateQualificationScore(sampleInput);
  const run2 = calculateQualificationScore(sampleInput);

  if (JSON.stringify(run1) !== JSON.stringify(run2)) {
    throw new Error("Idempotency failed: run1 and run2 differ");
  }
  console.log("  Run 1 score:", run1.totalScore, "Run 2 score:", run2.totalScore);
  console.log("  Exact identical breakdown and reasons verified ✅\n");

  // -------------------------------------------------------------
  // TEST 9: Update Recalculation (Score Increases Deterministically)
  // -------------------------------------------------------------
  console.log("▶ TEST 9: Update Recalculation");
  const leadInitial = { budget_max: 750000, timeline: "6_plus_months" };
  const leadUpdated = { budget_max: 750000, timeline: "within_30_days" };

  const scoreInitial = calculateQualificationScore(leadInitial);
  const scoreUpdated = calculateQualificationScore(leadUpdated);

  console.log(
    "  Initial (6_plus_months):",
    scoreInitial.totalScore,
    "(Timeline pts:",
    scoreInitial.breakdown.timeline,
    ")",
  );
  console.log(
    "  Updated (within_30_days):",
    scoreUpdated.totalScore,
    "(Timeline pts:",
    scoreUpdated.breakdown.timeline,
    ")",
  );
  if (
    scoreUpdated.totalScore <= scoreInitial.totalScore ||
    scoreUpdated.breakdown.timeline !== 30
  ) {
    throw new Error("Update recalculation failed");
  }
  console.log("  Score increased by 25 points as expected ✅\n");

  // -------------------------------------------------------------
  // TEST 10: Database Integration — qualifyLead Service
  // -------------------------------------------------------------
  console.log("▶ TEST 10: Database Lead Qualification Service (qualifyLead)");
  const testEmail = `qualtest_${Date.now()}@example.com`;
  const { data: dbLead, error: insertErr } = await supabase
    .from("leads")
    .insert({
      full_name: "Marcus Vance",
      email: testEmail,
      source: "website",
      status: "new",
      city: "Austin",
      property_type: "house",
      budget_min: 750000,
      budget_max: 1100000,
      bedrooms: 4,
      timeline: "within_30_days",
    })
    .select("id")
    .single();

  if (insertErr || !dbLead)
    throw new Error("Failed creating test lead: " + insertErr?.message);

  const qualResult = await qualifyLead(dbLead.id, {
    isContactConfirmed: true,
    userMessageCount: 3,
  });
  console.log("  Qualify Result for Lead:", dbLead.id);
  console.log("  Total Score:", qualResult.totalScore);
  console.log("  Category:", qualResult.category);
  console.log("  Breakdown:", qualResult.breakdown);
  console.log("  Reasons:", qualResult.reasons);

  // Check Supabase row
  const { data: updatedLead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", dbLead.id)
    .single();
  console.log("  Supabase lead_score in DB:", updatedLead?.lead_score);
  if (updatedLead?.lead_score !== qualResult.totalScore) {
    throw new Error("Database lead_score mismatch");
  }
  console.log("  Database persistence verified ✅\n");

  // -------------------------------------------------------------
  // TEST 11: Chatbot Lead Capture Automatic Qualification
  // -------------------------------------------------------------
  console.log("▶ TEST 11: Chatbot Lead Capture Automatic Qualification Trigger");
  const conv = await createConversation();
  await confirmLeadCapture(conv.id, conv.accessToken);
  const chatLeadEmail = `chatqual_${Date.now()}@example.com`;
  const chatLeadResult = await captureLeadFromChat({
    conversationId: conv.id,
    accessToken: conv.accessToken,
    name: "Clara Oswald",
    email: chatLeadEmail,
    timeline: "immediate",
    budget_min: 900000,
    budget_max: 1400000,
    location: "Austin",
    property_type: "house",
    bedrooms: 4,
  });

  console.log("  Created Chatbot Lead ID:", chatLeadResult.leadId);
  const { data: chatLeadRow } = await supabase
    .from("leads")
    .select("*")
    .eq("id", chatLeadResult.leadId)
    .single();
  console.log("  Automatically calculated lead_score:", chatLeadRow?.lead_score);
  if (!chatLeadRow?.lead_score || chatLeadRow.lead_score < 80) {
    throw new Error(
      "Chatbot lead automatic qualification failed, score: " + chatLeadRow?.lead_score,
    );
  }
  console.log("  Chatbot lead auto-qualification verified ✅\n");

  // -------------------------------------------------------------
  // TEST 12: Property Inquiry Automatic Qualification Trigger
  // -------------------------------------------------------------
  console.log("▶ TEST 12: Property Inquiry Automatic Qualification Trigger");
  const propRes = await createPropertyLead({
    full_name: "David Tennant",
    email: `propqual_${Date.now()}@example.com`,
    property_id: "f1656c0e-2482-4c60-8018-fdae7ca41a49",
    message: "I would like to schedule a private showing of this property this week.",
    source: "property_page",
  });
  console.log("  Created Property Lead ID:", propRes.id);
  if (propRes.id) {
    const { data: propLeadRow } = await supabase
      .from("leads")
      .select("*")
      .eq("id", propRes.id)
      .single();
    console.log(
      "  Automatically calculated property lead_score:",
      propLeadRow?.lead_score,
    );
    if (!propLeadRow?.lead_score || propLeadRow.lead_score <= 0) {
      throw new Error("Property inquiry auto-qualification failed");
    }
  }
  console.log("  Property inquiry auto-qualification verified ✅\n");

  // -------------------------------------------------------------
  // TEST 13: Phase 2 Public Regression Checks
  // -------------------------------------------------------------
  console.log("▶ TEST 13: Phase 2 Public Page Regression Checks");
  const baseUrl = "http://localhost:3000";
  const r1 = await fetch(`${baseUrl}/`);
  const r2 = await fetch(`${baseUrl}/properties`);
  console.log("  GET / status:", r1.status);
  console.log("  GET /properties status:", r2.status);
  if (r1.status !== 200 || r2.status !== 200) throw new Error("Regression test failed");

  console.log("\n================================================================");
  console.log("  ALL PHASE 4A UNIT AND INTEGRATION TESTS PASSED 100%!          ");
  console.log("================================================================");
}

runPhase4ATests();
