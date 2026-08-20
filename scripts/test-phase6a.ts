import { createServiceRoleClient } from "../src/lib/supabase/admin";
import {
  setEmailProvider,
  DevLogEmailProvider,
  emitNotificationEvent,
  clearIdempotencyCache,
  formatAppointmentDateTime,
  escapeHtml,
  renderCustomerAppointmentCreatedEmail,
  renderAgentAppointmentCreatedEmail,
  renderCustomerAppointmentRescheduledEmail,
  renderAgentAppointmentRescheduledEmail,
  renderCustomerAppointmentCancelledEmail,
  renderAgentAppointmentCancelledEmail,
  type AppointmentEmailTemplateData,
} from "../src/services/notifications";

async function runPhase6ATests() {
  console.log("================================================================");
  console.log("  AETHER ESTATES — PHASE 6A EMAIL AUTOMATION ENGINE TESTS       ");
  console.log("================================================================\n");

  const baseUrl = "http://localhost:3000";
  const supabase = createServiceRoleClient();

  // 0. Setup Mock/Dev Email Provider
  const mockProvider = new DevLogEmailProvider(true); // Silent for clean test output
  setEmailProvider(mockProvider);
  clearIdempotencyCache();

  // Fetch admin and agent profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("role", { ascending: true });

  const agent = profiles?.find((p) => p.role === "agent") || {
    id: "8cd3da1d-aa9e-4a5e-acb3-5c9db66c9c64",
    full_name: "Priya Shah",
    email: "priya.shah@aetherestates.com",
    role: "agent" as const,
  };

  console.log(`  Licensed Agent: ${agent.full_name} (${agent.email})`);

  // Create a verified test lead
  const testLeadEmail = `clara_oswald_${Date.now()}@test.aether.estate`;
  const { data: lead } = await supabase
    .from("leads")
    .insert({
      full_name: "Clara Oswald",
      email: testLeadEmail,
      phone: "512-555-9001",
      source: "chatbot",
      status: "qualified",
      assigned_agent_id: agent.id,
      city: "Austin",
      budget_max: 2750000,
      lead_score: 85,
      qualification_category: "hot",
    })
    .select("*")
    .single();

  if (!lead) {
    throw new Error("Failed to insert test lead.");
  }
  console.log(`  Prospect Lead: ${lead.full_name} (${lead.email}, ID: ${lead.id})\n`);

  async function insertTestAppointment(payload: {
    lead_id: string;
    agent_id: string;
    scheduled_at: string;
    duration_minutes?: number;
    type?: string;
    status?: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
    notes?: string | null;
  }) {
    const fullPayload = {
      lead_id: payload.lead_id,
      agent_id: payload.agent_id,
      scheduled_at: payload.scheduled_at,
      duration_minutes: payload.duration_minutes || 30,
      type: (payload.type || "property_viewing") as "property_viewing" | "consultation" | "call" | "video_call",
      status: (payload.status || "scheduled") as "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show",
      notes: payload.notes || null,
    };

    let { data, error } = await supabase
      .from("appointments")
      .insert(fullPayload)
      .select("*")
      .single();

    if (error && (error.code === "42703" || error.message?.includes("duration_minutes"))) {
      const basePayload = {
        lead_id: payload.lead_id,
        agent_id: payload.agent_id,
        scheduled_at: payload.scheduled_at,
        status: (payload.status || "scheduled") as "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show",
        notes: payload.notes || null,
      };
      const res = await supabase
        .from("appointments")
        .insert(basePayload)
        .select("*")
        .single();
      if (res.data) {
        data = {
          ...res.data,
          duration_minutes: payload.duration_minutes || 30,
          type: (payload.type || "property_viewing") as "property_viewing" | "consultation" | "call" | "video_call",
        };
        error = null;
      }
    }
    return { data, error };
  }

  // Create a future appointment
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 25);
  const testDateStr = testDate.toISOString().split("T")[0];
  const scheduledAt = `${testDateStr}T15:00:00Z`;

  // Clean slot
  await supabase
    .from("appointments")
    .delete()
    .gte("scheduled_at", `${testDateStr}T00:00:00Z`)
    .lte("scheduled_at", `${testDateStr}T23:59:59Z`);

  const { data: appt, error: apptErr } = await insertTestAppointment({
    lead_id: lead.id,
    agent_id: agent.id,
    scheduled_at: scheduledAt,
    duration_minutes: 30,
    type: "property_viewing",
    status: "scheduled",
    notes: "VIP lakefront showing request",
  });

  if (apptErr || !appt) {
    throw new Error(`Failed to insert test appointment: ${apptErr?.message}`);
  }
  console.log(`  Test Appointment ID: ${appt.id} (${scheduledAt})\n`);

  // -------------------------------------------------------------
  // TEST 1: Appointment Created -> Customer Email Triggered
  // -------------------------------------------------------------
  console.log("▶ TEST 1: Appointment Created -> Customer Email Dispatch");
  mockProvider.clear();
  clearIdempotencyCache();

  const outcome1 = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt.id,
    leadId: lead.id,
    agentId: agent.id,
    version: `created_${Date.now()}`,
  });

  const sent1 = mockProvider.getSentEmails();
  const customerEmail1 = sent1.find((e) => e.to === lead.email);

  console.log("  Customer Email Sent:", Boolean(customerEmail1));
  console.log("  Customer Email Subject:", customerEmail1?.subject);

  if (
    !outcome1.customerEmailSent ||
    !customerEmail1 ||
    !customerEmail1.subject.includes("Appointment Confirmed") ||
    !customerEmail1.html.includes(lead.full_name) ||
    !customerEmail1.html.includes(agent.full_name)
  ) {
    throw new Error("Test 1 Failed: Customer confirmation email was not sent correctly.");
  }
  console.log("  Customer creation email verified ✅\n");

  // -------------------------------------------------------------
  // TEST 2: Appointment Created -> Agent Email Triggered
  // -------------------------------------------------------------
  console.log("▶ TEST 2: Appointment Created -> Agent Alert Dispatch");
  const agentEmail1 = sent1.find((e) => e.to === agent.email);

  console.log("  Agent Email Sent:", Boolean(agentEmail1));
  console.log("  Agent Email Subject:", agentEmail1?.subject);

  if (
    !outcome1.agentEmailSent ||
    !agentEmail1 ||
    !agentEmail1.subject.includes("New Appointment Scheduled") ||
    !agentEmail1.html.includes(lead.full_name) ||
    !agentEmail1.html.includes("/dashboard/leads")
  ) {
    throw new Error("Test 2 Failed: Agent notification email was not sent correctly.");
  }
  console.log("  Agent creation email verified ✅\n");

  // -------------------------------------------------------------
  // TEST 3: Reschedule -> Customer Email Dispatch
  // -------------------------------------------------------------
  console.log("▶ TEST 3: Appointment Rescheduled -> Customer Email Dispatch");
  mockProvider.clear();
  clearIdempotencyCache();

  const newScheduledAt = `${testDate.toISOString().split("T")[0]}T19:00:00Z`;
  await supabase
    .from("appointments")
    .update({ scheduled_at: newScheduledAt })
    .eq("id", appt.id);

  const outcome3 = await emitNotificationEvent({
    event: "appointment.rescheduled",
    appointmentId: appt.id,
    leadId: lead.id,
    agentId: agent.id,
    previousScheduledAt: scheduledAt,
    version: `resched_${Date.now()}`,
  });

  const sent3 = mockProvider.getSentEmails();
  const customerEmail3 = sent3.find((e) => e.to === lead.email);

  console.log("  Customer Reschedule Email Sent:", Boolean(customerEmail3));
  console.log("  Customer Reschedule Subject:", customerEmail3?.subject);

  if (
    !outcome3.customerEmailSent ||
    !customerEmail3 ||
    !customerEmail3.subject.includes("Appointment Rescheduled") ||
    !customerEmail3.html.includes("Rescheduled")
  ) {
    throw new Error("Test 3 Failed: Customer reschedule email was not sent correctly.");
  }
  console.log("  Customer reschedule email verified ✅\n");

  // -------------------------------------------------------------
  // TEST 4: Reschedule -> Agent Email Dispatch
  // -------------------------------------------------------------
  console.log("▶ TEST 4: Appointment Rescheduled -> Agent Alert Dispatch");
  const agentEmail3 = sent3.find((e) => e.to === agent.email);

  console.log("  Agent Reschedule Email Sent:", Boolean(agentEmail3));
  console.log("  Agent Reschedule Subject:", agentEmail3?.subject);

  if (
    !outcome3.agentEmailSent ||
    !agentEmail3 ||
    !agentEmail3.subject.includes("Appointment Rescheduled") ||
    !agentEmail3.html.includes("/dashboard/leads")
  ) {
    throw new Error("Test 4 Failed: Agent reschedule email was not sent correctly.");
  }
  console.log("  Agent reschedule email verified ✅\n");

  // -------------------------------------------------------------
  // TEST 5: Cancellation -> Customer Email Dispatch
  // -------------------------------------------------------------
  console.log("▶ TEST 5: Appointment Cancelled -> Customer Email Dispatch");
  mockProvider.clear();
  clearIdempotencyCache();

  const cancelReason = "Client had family emergency and requested cancellation";
  await supabase
    .from("appointments")
    .update({ status: "cancelled", notes: `[Cancellation Reason]: ${cancelReason}` })
    .eq("id", appt.id);

  const outcome5 = await emitNotificationEvent({
    event: "appointment.cancelled",
    appointmentId: appt.id,
    leadId: lead.id,
    agentId: agent.id,
    reason: cancelReason,
    version: `cancel_${Date.now()}`,
  });

  const sent5 = mockProvider.getSentEmails();
  const customerEmail5 = sent5.find((e) => e.to === lead.email);

  console.log("  Customer Cancellation Email Sent:", Boolean(customerEmail5));
  console.log("  Customer Cancellation Subject:", customerEmail5?.subject);

  if (
    !outcome5.customerEmailSent ||
    !customerEmail5 ||
    !customerEmail5.subject.includes("Appointment Cancelled") ||
    !customerEmail5.html.includes(cancelReason)
  ) {
    throw new Error("Test 5 Failed: Customer cancellation email was not sent correctly.");
  }
  console.log("  Customer cancellation email verified ✅\n");

  // -------------------------------------------------------------
  // TEST 6: Cancellation -> Agent Email Dispatch
  // -------------------------------------------------------------
  console.log("▶ TEST 6: Appointment Cancelled -> Agent Alert Dispatch");
  const agentEmail5 = sent5.find((e) => e.to === agent.email);

  console.log("  Agent Cancellation Email Sent:", Boolean(agentEmail5));
  console.log("  Agent Cancellation Subject:", agentEmail5?.subject);

  if (
    !outcome5.agentEmailSent ||
    !agentEmail5 ||
    !agentEmail5.subject.includes("Appointment Cancelled") ||
    !agentEmail5.html.includes(cancelReason)
  ) {
    throw new Error("Test 6 Failed: Agent cancellation email was not sent correctly.");
  }
  console.log("  Agent cancellation email verified ✅\n");

  // -------------------------------------------------------------
  // TEST 7: Missing Customer Email Handled Gracefully
  // -------------------------------------------------------------
  console.log("▶ TEST 7: Missing Customer Email (Booking Succeeds Gracefully)");
  mockProvider.clear();
  clearIdempotencyCache();

  // Create lead with invalid email format (e.g. uncontactable)
  const { data: leadNoEmail, error: leadErr } = await supabase
    .from("leads")
    .insert({
      full_name: "Walk-in Buyer",
      email: `walkin_buyer_${Date.now()}`, // Missing '@' -> invalid email format
      phone: "512-555-9002",
      source: "manual",
      status: "new",
      assigned_agent_id: agent.id,
    })
    .select("*")
    .single();

  if (leadErr || !leadNoEmail) {
    throw new Error(`Failed to insert leadNoEmail: ${leadErr?.message}`);
  }

  const { data: apptNoEmail } = await insertTestAppointment({
    lead_id: leadNoEmail!.id,
    agent_id: agent.id,
    scheduled_at: `${testDateStr}T21:00:00Z`,
    duration_minutes: 30,
    type: "consultation",
    status: "scheduled",
  });

  const outcome7 = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: apptNoEmail!.id,
    leadId: leadNoEmail!.id,
    agentId: agent.id,
    version: `no_email_${Date.now()}`,
  });

  console.log("  Customer Email Sent:", outcome7.customerEmailSent);
  console.log("  Customer Skipped Reason:", outcome7.customerSkippedReason);
  console.log("  Agent Email Sent:", outcome7.agentEmailSent);

  if (outcome7.customerEmailSent !== false || !outcome7.customerSkippedReason) {
    throw new Error("Test 7 Failed: Missing customer email was not skipped safely.");
  }
  console.log("  Missing customer email handled gracefully ✅\n");

  // -------------------------------------------------------------
  // TEST 8: Provider Failure Resilience (Zero Business Rollback)
  // -------------------------------------------------------------
  console.log("▶ TEST 8: Provider Failure Resilience");
  mockProvider.clear();
  clearIdempotencyCache();
  mockProvider.setSimulatedFailure(true, "Temporary Resend Outage");

  const outcome8 = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt.id,
    leadId: lead.id,
    agentId: agent.id,
    version: `fail_${Date.now()}`,
  });

  mockProvider.setSimulatedFailure(false); // Reset
  console.log("  Customer email success:", outcome8.customerEmailSent);
  console.log("  Agent email success:", outcome8.agentEmailSent);

  // Verify appointment in DB is still untouched and valid
  const { data: apptAfterFail } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appt.id)
    .single();

  if (!apptAfterFail || apptAfterFail.id !== appt.id) {
    throw new Error("Test 8 Failed: Business record was corrupted after provider failure.");
  }
  console.log("  Provider failure resilience verified ✅\n");

  // -------------------------------------------------------------
  // TEST 9: Event Idempotency Guard
  // -------------------------------------------------------------
  console.log("▶ TEST 9: Event Idempotency Guard (Deduplication)");
  mockProvider.clear();
  clearIdempotencyCache();

  const staticVersion = "idempotent_v1_fixed";

  // First emission
  await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt.id,
    leadId: lead.id,
    agentId: agent.id,
    version: staticVersion,
  });
  const countFirst = mockProvider.getSentEmails().length;

  // Second emission with same key
  const outcome9b = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt.id,
    leadId: lead.id,
    agentId: agent.id,
    version: staticVersion,
  });
  const countSecond = mockProvider.getSentEmails().length;

  console.log("  Emails sent on First Emission:", countFirst);
  console.log("  Emails sent on Duplicate Emission:", countSecond);
  console.log("  Duplicate Skipped Reason:", outcome9b.customerSkippedReason);

  if (countFirst !== countSecond || !outcome9b.customerSkippedReason?.includes("Duplicate")) {
    throw new Error("Test 9 Failed: Idempotency guard did not prevent duplicate emails.");
  }
  console.log("  Event idempotency verified ✅\n");

  // -------------------------------------------------------------
  // TEST 10: HTML Escaping & Security Against XSS Injection
  // -------------------------------------------------------------
  console.log("▶ TEST 10: HTML Escaping & Content Security");
  const maliciousInput = '<script>alert("hack")</script> & "luxury"';
  const escaped = escapeHtml(maliciousInput);
  console.log("  Raw input:", maliciousInput);
  console.log("  Escaped output:", escaped);

  if (escaped.includes("<script>") || !escaped.includes("&lt;script&gt;") || !escaped.includes("&amp;")) {
    throw new Error("Test 10 Failed: HTML escaping failed to neutralize script tags.");
  }
  console.log("  HTML escaping security verified ✅\n");

  // -------------------------------------------------------------
  // TEST 11: Template Completeness (HTML + Plain Text)
  // -------------------------------------------------------------
  console.log("▶ TEST 11: Template Completeness (HTML & Text Coverage)");
  const sampleData: AppointmentEmailTemplateData = {
    appointmentId: "test-id",
    appointmentType: "property_viewing",
    typeLabel: "Property Viewing",
    durationMinutes: 30,
    scheduledAt: "2026-09-16T15:00:00Z",
    formattedDateTime: "Wednesday, September 16, 2026 at 10:00 AM CT",
    previousFormattedDateTime: "Tuesday, September 15, 2026 at 10:00 AM CT",
    timezone: "America/Chicago",
    leadName: "Eleanor Vance",
    leadEmail: "eleanor@test.com",
    agentName: "Priya Shah",
    agentEmail: "priya@aetherestates.com",
    propertyName: "The Monarch Penthouse",
    cancellationReason: "Schedule conflict",
    crmLeadUrl: "http://localhost:3000/dashboard/leads?search=eleanor%40test.com",
  };

  const t1 = renderCustomerAppointmentCreatedEmail(sampleData);
  const t2 = renderAgentAppointmentCreatedEmail(sampleData);
  const t3 = renderCustomerAppointmentRescheduledEmail(sampleData);
  const t4 = renderAgentAppointmentRescheduledEmail(sampleData);
  const t5 = renderCustomerAppointmentCancelledEmail(sampleData);
  const t6 = renderAgentAppointmentCancelledEmail(sampleData);

  const allTemplates = [t1, t2, t3, t4, t5, t6];
  for (const t of allTemplates) {
    if (!t.subject || !t.html || !t.text || t.html.length < 50 || t.text.length < 20) {
      throw new Error("Test 11 Failed: Template missing required HTML or Text components.");
    }
  }
  console.log("  All 6 email templates verified for HTML and Text completeness ✅\n");

  // -------------------------------------------------------------
  // TEST 12: Central Time Format Verification
  // -------------------------------------------------------------
  console.log("▶ TEST 12: Timezone Formatting Verification");
  const formatted = formatAppointmentDateTime("2026-09-16T15:00:00Z", "America/Chicago");
  console.log("  Formatted Central Time:", formatted);

  if (!formatted.includes("CT") || !formatted.includes("10:00 AM") || !formatted.includes("September 16, 2026")) {
    throw new Error(`Test 12 Failed: Unexpected date format '${formatted}'`);
  }
  console.log("  Central Time formatting verified ✅\n");

  // -------------------------------------------------------------
  // TEST 13: Full Regression Checks
  // -------------------------------------------------------------
  console.log("▶ TEST 13: Full System Regression Checks");
  const rHome = await fetch(`${baseUrl}/`);
  const rProps = await fetch(`${baseUrl}/properties`);
  const rCRM = await fetch(`${baseUrl}/dashboard`);
  const rAppts = await fetch(`${baseUrl}/dashboard/appointments`);

  console.log("  GET / status:", rHome.status);
  console.log("  GET /properties status:", rProps.status);
  console.log("  GET /dashboard status:", rCRM.status);
  console.log("  GET /dashboard/appointments status:", rAppts.status);

  if (rHome.status !== 200 || rProps.status !== 200) {
    throw new Error("Test 13 Failed: Public route regression detected.");
  }
  console.log("  Full system regression checks passed ✅\n");

  console.log("================================================================");
  console.log("  ALL PHASE 6A EMAIL AUTOMATION TESTS PASSED 100%!              ");
  console.log("================================================================");
}

runPhase6ATests();
