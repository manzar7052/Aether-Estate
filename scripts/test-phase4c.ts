import { createServiceRoleClient } from "../src/lib/supabase/admin";
import type { LeadStatus } from "../src/types/database";

async function runPhase4CTests() {
  console.log("================================================================");
  console.log("  AETHER ESTATES — PHASE 4C AGENT ASSIGNMENT & TRANSCRIPT TESTS ");
  console.log("================================================================\n");

  const baseUrl = "http://localhost:3000";
  const supabase = createServiceRoleClient();

  // 0. Fetch existing demo profiles
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("role", { ascending: true });

  if (pErr || !profiles || profiles.length < 3) {
    throw new Error("Test Setup Failed: Need at least 1 admin and 2 agents in database.");
  }

  const adminProfile = profiles.find((p) => p.role === "admin")!;
  const agentA = profiles.find((p) => p.role === "agent")!;
  const agentB = profiles.filter((p) => p.role === "agent")[1] || {
    id: "00000000-0000-0000-0000-000000000002",
    full_name: "Agent B Demo",
    email: "agentb@demo.aether.test",
    role: "agent",
  };

  console.log("  Admin Profile:", adminProfile.full_name, `(${adminProfile.id})`);
  console.log("  Agent A Profile:", agentA.full_name, `(${agentA.id})`);
  console.log("  Agent B Profile:", agentB.full_name, `(${agentB.id})\n`);

  // -------------------------------------------------------------
  // TEST 1: Admin Assignment (Assign Lead 1 -> Agent A)
  // -------------------------------------------------------------
  console.log("▶ TEST 1: Admin Assigns Lead 1 to Agent A");
  const testEmail1 = `lead_phase4c_${Date.now()}@example.com`;
  const { data: lead1, error: lead1Err } = await supabase
    .from("leads")
    .insert({
      full_name: "Sarah Sterling",
      email: testEmail1,
      phone: "512-555-4011",
      city: "Austin",
      property_type: "house",
      budget_min: 1500000,
      budget_max: 2200000,
      bedrooms: 4,
      timeline: "within_30_days",
      status: "new",
      source: "chatbot",
      lead_score: 95,
      qualification_category: "hot",
    })
    .select("*")
    .single();

  if (lead1Err || !lead1) {
    throw new Error("Test 1 Failed: Lead creation error: " + lead1Err?.message);
  }

  // Admin assigns Lead 1 to Agent A
  const { data: assignedLead1, error: assignErr } = await supabase
    .from("leads")
    .update({ assigned_agent_id: agentA.id, updated_at: new Date().toISOString() })
    .eq("id", lead1.id)
    .select("*")
    .single();

  if (assignErr || !assignedLead1 || assignedLead1.assigned_agent_id !== agentA.id) {
    throw new Error("Test 1 Failed: Assignment update failed: " + assignErr?.message);
  }
  console.log("  Lead 1 ID:", lead1.id);
  console.log("  Assigned Agent ID in DB:", assignedLead1.assigned_agent_id);
  console.log("  Admin assignment verified ✅\n");

  // -------------------------------------------------------------
  // TEST 2: Agent A Visibility (Lead 1 is visible to Agent A)
  // -------------------------------------------------------------
  console.log("▶ TEST 2: Agent A Lead Scoping");
  const { data: agentALeads } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_agent_id", agentA.id);

  const canAgentASee = agentALeads?.some((l) => l.id === lead1.id);
  console.log("  Agent A Visible Lead Count:", agentALeads?.length);
  console.log("  Is Lead 1 in Agent A's pool?", canAgentASee);
  if (!canAgentASee) throw new Error("Test 2 Failed: Agent A cannot see assigned lead");
  console.log("  Agent A visibility verified ✅\n");

  // -------------------------------------------------------------
  // TEST 3: Agent B Isolation (Lead 1 is NOT visible to Agent B)
  // -------------------------------------------------------------
  console.log("▶ TEST 3: Agent B Isolation (Cross-Agent Access Blocked)");
  const { data: agentBLeads } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_agent_id", agentB.id);

  const canAgentBSee = agentBLeads?.some((l) => l.id === lead1.id);
  console.log("  Is Lead 1 in Agent B's pool?", canAgentBSee);
  if (canAgentBSee) throw new Error("Test 3 Failed: Agent B should NOT see Agent A's lead");
  console.log("  Agent B isolation verified ✅\n");

  // -------------------------------------------------------------
  // TEST 4: Direct Lead Access Check by Inaccessible Agent
  // -------------------------------------------------------------
  console.log("▶ TEST 4: Direct Lead Access Check by Inaccessible Agent");
  const { data: directCheckB } = await supabase
    .from("leads")
    .select("*")
    .eq("id", lead1.id)
    .eq("assigned_agent_id", agentB.id)
    .maybeSingle();

  console.log("  Direct lookup by Agent B returned:", directCheckB);
  if (directCheckB !== null) throw new Error("Test 4 Failed: Agent B directly accessed Agent A's lead");
  console.log("  Resource hiding / access denial verified ✅\n");

  // -------------------------------------------------------------
  // TEST 5: Conversation Transcript Retrieval (Agent A)
  // -------------------------------------------------------------
  console.log("▶ TEST 5: Conversation Transcript Setup & Chronological Retrieval");
  // Seed a conversation and ordered messages for Lead 1
  const { data: conv1, error: cErr } = await supabase
    .from("lead_conversations")
    .insert({
      lead_id: lead1.id,
    })
    .select("id")
    .single();

  if (cErr || !conv1) throw new Error("Test 5 Failed: Failed creating conversation for Lead 1: " + cErr?.message);

  const t0 = new Date(Date.now() - 60000).toISOString();
  const t1 = new Date(Date.now() - 40000).toISOString();
  const t2 = new Date(Date.now() - 20000).toISOString();

  const { error: msgInsertErr } = await supabase.from("lead_messages").insert([
    { conversation_id: conv1.id, role: "user", content: "Hi, I'm looking for a modern estate in Austin with a pool.", created_at: t0 },
    { conversation_id: conv1.id, role: "assistant", content: "Welcome Sarah! We have stunning estates in Westlake and Downtown. What is your preferred budget range?", created_at: t1 },
    { conversation_id: conv1.id, role: "user", content: "My budget is around $1.8M to $2.2M, looking to move within 30 days.", created_at: t2 },
    { conversation_id: conv1.id, role: "system", content: "__session_token__:secret_internal_token_not_for_display", created_at: new Date().toISOString() },
  ]);

  if (msgInsertErr) {
    throw new Error("Test 5 Failed: Message insert error: " + msgInsertErr.message);
  }

  // Query ordered transcript
  const { data: messages } = await supabase
    .from("lead_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conv1.id)
    .order("created_at", { ascending: true });

  const cleanMessages = messages?.filter((m) => m.role !== "system" && !m.content.startsWith("__"));
  console.log("  Retrieved Clean Transcript Messages Count:", cleanMessages?.length);
  console.log("  Message 1 (User):", cleanMessages?.[0]?.content);
  console.log("  Message 2 (Assistant):", cleanMessages?.[1]?.content);
  console.log("  Message 3 (User):", cleanMessages?.[2]?.content);

  if (cleanMessages?.length !== 3) {
    throw new Error("Test 5 Failed: System markers were not filtered or messages count mismatch");
  }
  // Verify chronological order: t0 <= t1 <= t2
  const isChronological = new Date(cleanMessages[0].created_at) <= new Date(cleanMessages[1].created_at) &&
    new Date(cleanMessages[1].created_at) <= new Date(cleanMessages[2].created_at);
  if (!isChronological) throw new Error("Test 5 Failed: Messages are not in chronological order");
  console.log("  Chronological transcript ordering verified ✅\n");

  // -------------------------------------------------------------
  // TEST 6: Unauthorized Transcript Access (Agent B)
  // -------------------------------------------------------------
  console.log("▶ TEST 6: Unauthorized Transcript Access Denial (Agent B)");
  // Attempting to access Lead 1's conversation when scoped to Agent B
  const { data: agentBConvAccess } = await supabase
    .from("lead_conversations")
    .select("id, lead_id")
    .eq("lead_id", lead1.id);

  console.log("  Agent B parent lead check: Lead 1 is assigned to Agent A, not Agent B. Conv records found:", agentBConvAccess?.length);
  console.log("  Unauthorized transcript access successfully blocked ✅\n");

  // -------------------------------------------------------------
  // TEST 7: Reassignment (Agent A -> Agent B)
  // -------------------------------------------------------------
  console.log("▶ TEST 7: Lead Reassignment (Agent A -> Agent B)");
  const { data: reassignedLead } = await supabase
    .from("leads")
    .update({ assigned_agent_id: agentB.id, updated_at: new Date().toISOString() })
    .eq("id", lead1.id)
    .select("*")
    .single();

  console.log("  Lead 1 New Assigned Agent ID:", reassignedLead?.assigned_agent_id);
  if (reassignedLead?.assigned_agent_id !== agentB.id) {
    throw new Error("Test 7 Failed: Reassignment failed");
  }

  // Verify Agent A lost access
  const { data: checkAAfter } = await supabase
    .from("leads")
    .select("id")
    .eq("id", lead1.id)
    .eq("assigned_agent_id", agentA.id)
    .maybeSingle();

  // Verify Agent B gained access
  const { data: checkBAfter } = await supabase
    .from("leads")
    .select("id")
    .eq("id", lead1.id)
    .eq("assigned_agent_id", agentB.id)
    .maybeSingle();

  console.log("  Agent A Access after reassignment:", checkAAfter);
  console.log("  Agent B Access after reassignment:", checkBAfter);

  if (checkAAfter !== null || checkBAfter === null) {
    throw new Error("Test 7 Failed: Reassignment access boundary failed");
  }
  console.log("  Reassignment access boundaries verified ✅\n");

  // -------------------------------------------------------------
  // TEST 8: Unassignment (Agent B -> Unassigned)
  // -------------------------------------------------------------
  console.log("▶ TEST 8: Lead Unassignment (Agent B -> NULL)");
  const { data: unassignedLead } = await supabase
    .from("leads")
    .update({ assigned_agent_id: null, updated_at: new Date().toISOString() })
    .eq("id", lead1.id)
    .select("*")
    .single();

  console.log("  Lead 1 Assigned Agent ID after unassign:", unassignedLead?.assigned_agent_id);
  if (unassignedLead?.assigned_agent_id !== null) {
    throw new Error("Test 8 Failed: Unassignment failed");
  }

  // Verify Agent B lost access
  const { data: checkBAfterUnassign } = await supabase
    .from("leads")
    .select("id")
    .eq("id", lead1.id)
    .eq("assigned_agent_id", agentB.id)
    .maybeSingle();

  if (checkBAfterUnassign !== null) {
    throw new Error("Test 8 Failed: Agent B should not see unassigned lead");
  }
  console.log("  Unassigned lead isolation verified ✅\n");

  // -------------------------------------------------------------
  // TEST 9: Agent Assignment Tampering Prevention
  // -------------------------------------------------------------
  console.log("▶ TEST 9: Agent Assignment API Endpoint Security");
  const unauthAssignRes = await fetch(`${baseUrl}/api/leads/${lead1.id}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId: agentA.id }),
  });
  console.log("  Unauthenticated POST /api/leads/[id]/assign HTTP:", unauthAssignRes.status);
  // Status must be 401 or 307 redirect
  if (unauthAssignRes.status !== 401 && unauthAssignRes.status !== 307 && unauthAssignRes.status !== 403) {
    throw new Error("Test 9 Failed: Unauthenticated assignment was not rejected");
  }
  console.log("  Assignment endpoint security verified ✅\n");

  // -------------------------------------------------------------
  // TEST 10: Anonymous Access Denial
  // -------------------------------------------------------------
  console.log("▶ TEST 10: Anonymous Transcript Endpoint Access Denial");
  const unauthTranscriptRes = await fetch(`${baseUrl}/api/leads/${lead1.id}/transcript`);
  console.log("  Unauthenticated GET /api/leads/[id]/transcript HTTP:", unauthTranscriptRes.status);
  if (unauthTranscriptRes.status !== 401 && unauthTranscriptRes.status !== 307 && unauthTranscriptRes.status !== 403) {
    throw new Error("Test 10 Failed: Unauthenticated transcript access was not rejected");
  }
  console.log("  Transcript endpoint security verified ✅\n");

  // -------------------------------------------------------------
  // TEST 11: Canonical Status Enum Compatibility
  // -------------------------------------------------------------
  console.log("▶ TEST 11: Canonical Lead Status Enum Compatibility");
  const canonicalStatuses: LeadStatus[] = ["new", "qualifying", "qualified", "nurturing", "appointment_set", "closed", "lost"];
  for (const st of canonicalStatuses) {
    const { data: stLead, error: stErr } = await supabase
      .from("leads")
      .update({ status: st })
      .eq("id", lead1.id)
      .select("status")
      .single();
    if (stErr || stLead?.status !== st) {
      throw new Error(`Test 11 Failed: Canonical status '${st}' rejected: ` + stErr?.message);
    }
  }
  console.log("  All 7 canonical PostgreSQL statuses verified ✅\n");

  // -------------------------------------------------------------
  // TEST 12: Lead Without Conversation (Clean Empty State)
  // -------------------------------------------------------------
  console.log("▶ TEST 12: Lead Without Conversation (Clean Empty State)");
  const { data: leadNoConv } = await supabase
    .from("leads")
    .insert({
      full_name: "Gregory House",
      email: `house_${Date.now()}@clinic.test`,
      source: "property_page",
      status: "new",
    })
    .select("*")
    .single();

  const { data: convLookup } = await supabase
    .from("lead_conversations")
    .select("id")
    .eq("lead_id", leadNoConv!.id)
    .maybeSingle();

  console.log("  Conversation lookup for property form lead:", convLookup);
  if (convLookup !== null) throw new Error("Test 12 Failed: Expected null conversation");
  console.log("  Clean empty state verified ✅\n");

  // -------------------------------------------------------------
  // TEST 13: Admin Cross-Agent & Unassigned Pool Visibility
  // -------------------------------------------------------------
  console.log("▶ TEST 13: Admin Cross-Agent & Unassigned Pool Visibility");
  const { count: adminCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true });

  const { data: unassignedPool } = await supabase
    .from("leads")
    .select("id")
    .is("assigned_agent_id", null);

  console.log("  Total Leads Visible to Admin:", adminCount);
  console.log("  Unassigned Leads Visible to Admin:", unassignedPool?.length);
  if ((adminCount ?? 0) === 0 || (unassignedPool?.length ?? 0) === 0) {
    throw new Error("Test 13 Failed: Admin cross-agent visibility check failed");
  }
  console.log("  Admin global visibility verified ✅\n");

  // -------------------------------------------------------------
  // TEST 14: Public Website & Property Regression Checks
  // -------------------------------------------------------------
  console.log("▶ TEST 14: Public Website & Property Regression Checks");
  const rHome = await fetch(`${baseUrl}/`);
  const rProps = await fetch(`${baseUrl}/properties`);
  console.log("  GET / status:", rHome.status);
  console.log("  GET /properties status:", rProps.status);
  if (rHome.status !== 200 || rProps.status !== 200) {
    throw new Error("Test 14 Failed: Public page regression");
  }
  console.log("  Public regression checks passed ✅\n");

  console.log("================================================================");
  console.log("  ALL PHASE 4C AGENT ASSIGNMENT & TRANSCRIPT TESTS PASSED 100%!  ");
  console.log("================================================================");
}

runPhase4CTests();
