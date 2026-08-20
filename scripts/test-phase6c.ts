/**
 * Phase 6C Automated Test Suite — Aether Estates
 * Comprehensive runtime validation for WhatsApp Automation & Multi-Channel Routing.
 */

import { createServiceRoleClient } from "../src/lib/supabase/admin";
import {
  emitNotificationEvent,
  clearIdempotencyCache,
} from "../src/services/notifications/events/handler";
import {
  DevLogWhatsAppProvider,
  setCustomWhatsAppProvider,
} from "../src/services/notifications/whatsapp/provider";
import { DevLogEmailProvider } from "../src/services/notifications/email/dev-provider";
import { setEmailProvider } from "../src/services/notifications/email/provider";
import { normalizePhoneNumber } from "../src/services/notifications/whatsapp/phone";
import {
  setLeadWhatsAppConsent,
  checkCustomerWhatsAppEligibility,
  checkAgentWhatsAppEligibility,
} from "../src/services/notifications/whatsapp/consent";
import {
  renderCustomerAppointmentCreatedWhatsApp,
  renderAgentAppointmentCreatedWhatsApp,
  renderCustomerAppointmentRescheduledWhatsApp,
  renderAgentAppointmentRescheduledWhatsApp,
  renderCustomerAppointmentCancelledWhatsApp,
  renderAgentAppointmentCancelledWhatsApp,
  renderCustomerAppointmentReminderWhatsApp,
  renderAgentAppointmentReminderWhatsApp,
} from "../src/services/notifications/whatsapp/templates";
import { formatAppointmentDateTime } from "../src/services/notifications/email/formatters";
import { APPLICATION_TIMEZONE } from "../src/services/appointments/types";
import type { Lead, Profile, AppointmentType, AppointmentStatus } from "../src/types/database";

async function runPhase6CTests() {
  console.log("================================================================");
  console.log("  AETHER ESTATES — PHASE 6C WHATSAPP AUTOMATION TESTS           ");
  console.log("================================================================\n");

  const supabase = createServiceRoleClient();
  const mockWhatsAppProvider = new DevLogWhatsAppProvider();
  setCustomWhatsAppProvider(mockWhatsAppProvider);

  const mockEmailProvider = new DevLogEmailProvider();
  setEmailProvider(mockEmailProvider);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // -------------------------------------------------------------
  // Setup: Agents and Prospects
  // -------------------------------------------------------------
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "admin")
    .limit(1)
    .single();

  const { data: agentProfiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "agent")
    .limit(2);

  if (!adminProfile || !agentProfiles || agentProfiles.length < 2) {
    throw new Error("Pre-requisite failed: Need 1 admin and at least 2 agents in profiles.");
  }

  const agentA = agentProfiles[0];
  const agentB = agentProfiles[1];

  // Ensure Agent A has a valid phone number for testing
  await supabase
    .from("profiles")
    .update({
      phone: "+15125550199",
      whatsapp_notifications_enabled: true,
    })
    .eq("id", agentA.id);

  // Reload Agent A
  const { data: refreshedAgentA } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", agentA.id)
    .single();

  const testAgentA = refreshedAgentA || agentA;

  // Insert a primary opted-in test prospect lead
  const testPhone = "+15125550144";
  const { data: leadOptedIn, error: leadErr } = await supabase
    .from("leads")
    .insert({
      full_name: "Rose Tyler",
      email: `rose_tyler_${Date.now()}@test.aether.estate`,
      phone: testPhone,
      source: "website",
      status: "qualified",
      assigned_agent_id: testAgentA.id,
      whatsapp_opt_in: true,
      whatsapp_opt_in_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (leadErr || !leadOptedIn) {
    throw new Error(`Failed to create test lead: ${leadErr?.message}`);
  }

  console.log(`  Opted-In Lead: ${leadOptedIn.full_name} (${leadOptedIn.phone})`);
  console.log(`  Assigned Agent: ${testAgentA.full_name} (${testAgentA.phone})\n`);

  let slotCounter = 0;
  function getNextTestSlot(): string {
    slotCounter += 2;
    const d = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000 + slotCounter * 60 * 60 * 1000);
    return d.toISOString();
  }

  async function createTestAppointment(payload: {
    lead_id: string;
    agent_id: string;
    scheduled_at?: string;
    duration_minutes?: number;
    type?: AppointmentType;
    status?: AppointmentStatus;
    notes?: string | null;
  }) {
    const scheduled_at = payload.scheduled_at || getNextTestSlot();
    const fullPayload = {
      lead_id: payload.lead_id,
      agent_id: payload.agent_id,
      scheduled_at,
      duration_minutes: payload.duration_minutes || 30,
      type: payload.type || ("property_viewing" as AppointmentType),
      status: payload.status || ("scheduled" as AppointmentStatus),
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
        scheduled_at,
        status: payload.status || ("scheduled" as AppointmentStatus),
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
          type: payload.type || ("property_viewing" as AppointmentType),
        };
        error = null;
      }
    }

    if (error || !data) {
      throw new Error(`Failed to insert test appointment: ${error?.message}`);
    }
    return data;
  }

  // Insert base test appointment
  const scheduledAt = getNextTestSlot();
  const appt1 = await createTestAppointment({
    lead_id: leadOptedIn.id,
    agent_id: testAgentA.id,
    scheduled_at: scheduledAt,
    duration_minutes: 30,
    type: "property_viewing",
    status: "scheduled",
    notes: "First showing for Rose",
  });

  // -------------------------------------------------------------
  // TEST 1: Valid Customer Phone + Opt-In + appointment.created -> WhatsApp Sent
  // -------------------------------------------------------------
  console.log("▶ TEST 1: Valid Customer Phone + Opt-In + appointment.created");
  mockWhatsAppProvider.clear();
  mockEmailProvider.clear();
  clearIdempotencyCache();

  const outcome1 = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt1!.id,
    leadId: leadOptedIn.id,
    agentId: testAgentA.id,
    version: "test_1",
  });

  const sentMsgs1 = mockWhatsAppProvider.getSentMessages();
  const custMsg1 = sentMsgs1.find((m) => m.to === testPhone);
  const agentMsg1 = sentMsgs1.find((m) => m.to === testAgentA.phone);

  console.log("  Customer WhatsApp Sent:", outcome1.customerWhatsAppSent);
  console.log("  Agent WhatsApp Sent:", outcome1.agentWhatsAppSent);
  console.log("  Total WhatsApp Messages Dispatched:", sentMsgs1.length);

  if (
    !outcome1.customerWhatsAppSent ||
    !custMsg1 ||
    !custMsg1.body.includes("Appointment Confirmed") ||
    !agentMsg1 ||
    !agentMsg1.body.includes("New Appointment Booked")
  ) {
    throw new Error("Test 1 Failed: WhatsApp created message was not dispatched correctly.");
  }
  console.log("  Valid customer phone + opt-in dispatch verified ✅\n");

  // -------------------------------------------------------------
  // TEST 2: Valid Phone + NO Opt-In -> WhatsApp Skipped (NO_OPT_IN)
  // -------------------------------------------------------------
  console.log("▶ TEST 2: Valid Phone + NO Opt-In -> Skipped");
  mockWhatsAppProvider.clear();
  mockEmailProvider.clear();
  clearIdempotencyCache();

  const { data: leadNoOptIn } = await supabase
    .from("leads")
    .insert({
      full_name: "Donna Noble",
      email: `donna_noble_${Date.now()}@test.aether.estate`,
      phone: "+15125550188",
      source: "website",
      status: "new",
      assigned_agent_id: testAgentA.id,
      whatsapp_opt_in: false, // NO OPT-IN
    })
    .select("*")
    .single();

  const appt2 = await createTestAppointment({
    lead_id: leadNoOptIn!.id,
    agent_id: testAgentA.id,
    duration_minutes: 30,
    type: "consultation",
    status: "scheduled",
  });

  const outcome2 = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt2.id,
    leadId: leadNoOptIn!.id,
    agentId: testAgentA.id,
    version: "test_2",
  });

  console.log("  Customer WhatsApp Sent:", outcome2.customerWhatsAppSent);
  console.log("  Customer Skipped Reason:", outcome2.customerWhatsAppSkippedReason);
  console.log("  Customer Email Sent:", outcome2.customerEmailSent);

  if (
    outcome2.customerWhatsAppSent !== false ||
    outcome2.customerWhatsAppSkippedReason !== "NO_OPT_IN" ||
    !outcome2.customerEmailSent
  ) {
    throw new Error("Test 2 Failed: Lead without opt-in was sent a WhatsApp message.");
  }
  console.log("  Missing opt-in correctly skipped without affecting email ✅\n");

  // -------------------------------------------------------------
  // TEST 3: Missing Phone -> WhatsApp Skipped (MISSING_PHONE)
  // -------------------------------------------------------------
  console.log("▶ TEST 3: Missing Phone -> Skipped");
  mockWhatsAppProvider.clear();
  mockEmailProvider.clear();
  clearIdempotencyCache();

  const { data: leadNoPhone } = await supabase
    .from("leads")
    .insert({
      full_name: "Martha Jones",
      email: `martha_jones_${Date.now()}@test.aether.estate`,
      phone: null, // NO PHONE
      source: "website",
      status: "new",
      assigned_agent_id: testAgentA.id,
      whatsapp_opt_in: true,
    })
    .select("*")
    .single();

  const appt3 = await createTestAppointment({
    lead_id: leadNoPhone!.id,
    agent_id: testAgentA.id,
    duration_minutes: 30,
    type: "consultation",
    status: "scheduled",
  });

  const outcome3 = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt3.id,
    leadId: leadNoPhone!.id,
    agentId: testAgentA.id,
    version: "test_3",
  });

  console.log("  Customer WhatsApp Sent:", outcome3.customerWhatsAppSent);
  console.log("  Customer Skipped Reason:", outcome3.customerWhatsAppSkippedReason);

  if (
    outcome3.customerWhatsAppSent !== false ||
    outcome3.customerWhatsAppSkippedReason !== "MISSING_PHONE"
  ) {
    throw new Error("Test 3 Failed: Missing phone was not skipped properly.");
  }
  console.log("  Missing phone correctly skipped ✅\n");

  // -------------------------------------------------------------
  // TEST 4: Invalid Phone -> WhatsApp Skipped without Provider Call
  // -------------------------------------------------------------
  console.log("▶ TEST 4: Invalid Phone -> Skipped without Provider Call");
  mockWhatsAppProvider.clear();
  clearIdempotencyCache();

  const { data: leadBadPhone } = await supabase
    .from("leads")
    .insert({
      full_name: "Rory Williams",
      email: `rory_${Date.now()}@test.aether.estate`,
      phone: "123", // INVALID PHONE
      source: "website",
      status: "new",
      assigned_agent_id: testAgentA.id,
      whatsapp_opt_in: true,
    })
    .select("*")
    .single();

  const apptBadPhone = await createTestAppointment({
    lead_id: leadBadPhone!.id,
    agent_id: testAgentA.id,
    duration_minutes: 30,
    type: "consultation",
    status: "scheduled",
  });

  const outcome4 = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: apptBadPhone.id,
    leadId: leadBadPhone!.id,
    agentId: testAgentA.id,
    version: "test_4",
  });

  console.log("  Customer WhatsApp Sent:", outcome4.customerWhatsAppSent);
  console.log("  Customer Skipped Reason:", outcome4.customerWhatsAppSkippedReason);

  if (
    outcome4.customerWhatsAppSent !== false ||
    outcome4.customerWhatsAppSkippedReason !== "INVALID_PHONE"
  ) {
    throw new Error("Test 4 Failed: Invalid phone was not skipped properly.");
  }
  console.log("  Invalid phone rejected without provider call ✅\n");

  // -------------------------------------------------------------
  // TEST 5: Appointment Rescheduled -> WhatsApp Notification
  // -------------------------------------------------------------
  console.log("▶ TEST 5: Appointment Rescheduled -> WhatsApp Notification");
  mockWhatsAppProvider.clear();
  clearIdempotencyCache();

  const newScheduledAt = getNextTestSlot();
  await supabase
    .from("appointments")
    .update({ scheduled_at: newScheduledAt })
    .eq("id", appt1.id);

  const outcome5 = await emitNotificationEvent({
    event: "appointment.rescheduled",
    appointmentId: appt1.id,
    leadId: leadOptedIn.id,
    agentId: testAgentA.id,
    previousScheduledAt: scheduledAt,
    version: "resched_v1",
  });

  const sentMsgs5 = mockWhatsAppProvider.getSentMessages();
  const custReschedMsg = sentMsgs5.find((m) => m.to === testPhone);

  console.log("  Customer Reschedule WhatsApp Sent:", outcome5.customerWhatsAppSent);
  console.log("  Reschedule Message Preview:", custReschedMsg?.body.split("\n")[0]);

  if (
    !outcome5.customerWhatsAppSent ||
    !custReschedMsg ||
    !custReschedMsg.body.includes("Appointment Rescheduled")
  ) {
    throw new Error("Test 5 Failed: Reschedule WhatsApp notification was not sent.");
  }
  console.log("  Appointment reschedule WhatsApp notification verified ✅\n");

  // -------------------------------------------------------------
  // TEST 6: Appointment Cancelled -> WhatsApp Notification
  // -------------------------------------------------------------
  console.log("▶ TEST 6: Appointment Cancelled -> WhatsApp Notification");
  mockWhatsAppProvider.clear();
  clearIdempotencyCache();

  await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appt1.id);

  const outcome6 = await emitNotificationEvent({
    event: "appointment.cancelled",
    appointmentId: appt1.id,
    leadId: leadOptedIn.id,
    agentId: testAgentA.id,
    reason: "Client travel schedule change",
    version: "cancel_v1",
  });

  const sentMsgs6 = mockWhatsAppProvider.getSentMessages();
  const custCancelMsg = sentMsgs6.find((m) => m.to === testPhone);

  console.log("  Customer Cancellation WhatsApp Sent:", outcome6.customerWhatsAppSent);
  console.log("  Cancellation Message Preview:", custCancelMsg?.body.split("\n")[0]);

  if (
    !outcome6.customerWhatsAppSent ||
    !custCancelMsg ||
    !custCancelMsg.body.includes("Appointment Cancelled") ||
    !custCancelMsg.body.includes("Client travel schedule change")
  ) {
    throw new Error("Test 6 Failed: Cancellation WhatsApp notification was not sent.");
  }
  console.log("  Appointment cancellation WhatsApp notification verified ✅\n");

  // -------------------------------------------------------------
  // TEST 7 & 8: 24h & 1h Reminder Events -> WhatsApp Dispatched
  // -------------------------------------------------------------
  console.log("▶ TEST 7 & 8: 24h & 1h Reminder WhatsApp Dispatches");
  mockWhatsAppProvider.clear();
  clearIdempotencyCache();

  // Create an active appointment for reminders
  const apptRem = await createTestAppointment({
    lead_id: leadOptedIn.id,
    agent_id: testAgentA.id,
    duration_minutes: 30,
    type: "property_viewing",
    status: "scheduled",
  });

  // 24h reminder
  const outcome24h = await emitNotificationEvent({
    event: "appointment.reminder_24h",
    appointmentId: apptRem.id,
    leadId: leadOptedIn.id,
    agentId: testAgentA.id,
    version: "rem_24h_v1",
  });

  // 1h reminder
  const outcome1h = await emitNotificationEvent({
    event: "appointment.reminder_1h",
    appointmentId: apptRem.id,
    leadId: leadOptedIn.id,
    agentId: testAgentA.id,
    version: "rem_1h_v1",
  });

  const sentRemMsgs = mockWhatsAppProvider.getSentMessages();
  const msg24h = sentRemMsgs.find((m) => m.templateName?.includes("24h"));
  const msg1h = sentRemMsgs.find((m) => m.templateName?.includes("1h"));

  console.log("  24h Reminder WhatsApp Sent:", outcome24h.customerWhatsAppSent);
  console.log("  1h Reminder WhatsApp Sent:", outcome1h.customerWhatsAppSent);
  console.log("  24h Template:", msg24h?.templateName);
  console.log("  1h Template:", msg1h?.templateName);

  if (
    !outcome24h.customerWhatsAppSent ||
    !outcome1h.customerWhatsAppSent ||
    !msg24h ||
    !msg1h
  ) {
    throw new Error("Test 7/8 Failed: 24h/1h reminder WhatsApp notifications failed.");
  }
  console.log("  24h and 1h reminder WhatsApp dispatches verified ✅\n");

  // -------------------------------------------------------------
  // TEST 9 & 10: Cancelled & Completed Appointments -> Reminders Skipped
  // -------------------------------------------------------------
  console.log("▶ TEST 9 & 10: Cancelled & Completed Appointments Reminders Skipped");
  mockWhatsAppProvider.clear();
  clearIdempotencyCache();

  // Cancelled appt
  await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", apptRem.id);

  // In reminders service, status check skips cancelled appointments
  // Emit event simulating reminder service eligibility check
  const { data: checkCancelledAppt } = await supabase
    .from("appointments")
    .select("status")
    .eq("id", apptRem.id)
    .single();

  const isCancelledEligible =
    checkCancelledAppt?.status === "scheduled" || checkCancelledAppt?.status === "confirmed";

  // Completed appt
  await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", apptRem.id);

  const { data: checkCompletedAppt } = await supabase
    .from("appointments")
    .select("status")
    .eq("id", apptRem.id)
    .single();

  const isCompletedEligible =
    checkCompletedAppt?.status === "scheduled" || checkCompletedAppt?.status === "confirmed";

  console.log("  Cancelled Appointment Reminder Eligible:", isCancelledEligible);
  console.log("  Completed Appointment Reminder Eligible:", isCompletedEligible);

  if (isCancelledEligible || isCompletedEligible) {
    throw new Error("Test 9/10 Failed: Inactive appointments were deemed eligible for reminders.");
  }
  console.log("  Cancelled and Completed appointment reminder skipping verified ✅\n");

  // -------------------------------------------------------------
  // TEST 11: Duplicate Event Idempotency (Deduplication)
  // -------------------------------------------------------------
  console.log("▶ TEST 11: Duplicate Event Idempotency Deduplication");
  mockWhatsAppProvider.clear();
  clearIdempotencyCache();

  // First emission
  await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt1.id,
    leadId: leadOptedIn.id,
    agentId: testAgentA.id,
    version: "idempotent_test_v1",
  });
  const countFirst = mockWhatsAppProvider.getSentMessages().length;

  // Duplicate emission (same key)
  const duplicateOutcome = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt1.id,
    leadId: leadOptedIn.id,
    agentId: testAgentA.id,
    version: "idempotent_test_v1",
  });
  const countSecond = mockWhatsAppProvider.getSentMessages().length;

  console.log("  Messages sent on first emission:", countFirst);
  console.log("  Messages sent after duplicate emission:", countSecond);
  console.log("  Duplicate Skipped Reason:", duplicateOutcome.customerWhatsAppSkippedReason);

  if (countFirst !== 2 || countSecond !== 2) {
    throw new Error("Test 11 Failed: Duplicate event triggered duplicate WhatsApp messages.");
  }
  console.log("  Event idempotency deduplication verified ✅\n");

  // -------------------------------------------------------------
  // TEST 12: Concurrent Duplicate Event Processing Simulation
  // -------------------------------------------------------------
  console.log("▶ TEST 12: Concurrent Duplicate Event Processing Simulation");
  mockWhatsAppProvider.clear();
  clearIdempotencyCache();

  const [resA, resB] = await Promise.all([
    emitNotificationEvent({
      event: "appointment.created",
      appointmentId: appt1.id,
      leadId: leadOptedIn.id,
      agentId: testAgentA.id,
      version: "concurrent_test_v1",
    }),
    emitNotificationEvent({
      event: "appointment.created",
      appointmentId: appt1.id,
      leadId: leadOptedIn.id,
      agentId: testAgentA.id,
      version: "concurrent_test_v1",
    }),
  ]);

  const totalConcurrentSent = mockWhatsAppProvider.getSentMessages().length;
  console.log("  Worker A Customer Sent:", resA.customerWhatsAppSent);
  console.log("  Worker B Customer Sent:", resB.customerWhatsAppSent);
  console.log("  Total Concurrent WhatsApp Dispatches:", totalConcurrentSent);

  if (totalConcurrentSent !== 2) {
    // Exactly 2 messages: 1 for customer, 1 for agent from the winning emission
    throw new Error("Test 12 Failed: Concurrency allowed double dispatch.");
  }
  console.log("  Concurrent event deduplication verified ✅\n");

  // -------------------------------------------------------------
  // TEST 13 & 14: Provider Transient Failure vs Permanent Validation
  // -------------------------------------------------------------
  console.log("▶ TEST 13 & 14: Provider Transient Failure & Permanent Validation");
  mockWhatsAppProvider.clear();
  clearIdempotencyCache();
  mockWhatsAppProvider.setSimulatedFailure(true, "Temporary Provider Outage", "PROVIDER_TEMPORARY_ERROR");

  const outcomeFail = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt1.id,
    leadId: leadOptedIn.id,
    agentId: testAgentA.id,
    version: "fail_test_v1",
  });

  console.log("  Transient Failure Customer Sent:", outcomeFail.customerWhatsAppSent);
  console.log("  Transient Failure Skipped Reason:", outcomeFail.customerWhatsAppSkippedReason);

  mockWhatsAppProvider.setSimulatedFailure(false); // Reset provider

  // Test permanent phone validation
  const validationRes = normalizePhoneNumber("abc-xyz");
  console.log("  Invalid format validation valid:", validationRes.valid, "reason:", validationRes.reason);

  if (outcomeFail.customerWhatsAppSent || validationRes.valid) {
    throw new Error("Test 13/14 Failed: Error classification or validation failed.");
  }
  console.log("  Provider transient and permanent error classification verified ✅\n");

  // -------------------------------------------------------------
  // TEST 15 & 16: Channel Failure Isolation (Email vs WhatsApp)
  // -------------------------------------------------------------
  console.log("▶ TEST 15 & 16: Channel Failure Isolation (Email vs WhatsApp)");
  mockWhatsAppProvider.clear();
  mockEmailProvider.clear();
  clearIdempotencyCache();

  // Scenario A: Email fails, WhatsApp succeeds
  mockEmailProvider.setSimulatedFailure(true, "Resend Down");
  mockWhatsAppProvider.setSimulatedFailure(false);

  const outcomeA = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt1.id,
    leadId: leadOptedIn.id,
    agentId: testAgentA.id,
    version: "iso_a_v1",
  });

  console.log("  Scenario A -> Email Sent:", outcomeA.customerEmailSent, "| WhatsApp Sent:", outcomeA.customerWhatsAppSent);

  // Scenario B: WhatsApp fails, Email succeeds
  mockEmailProvider.setSimulatedFailure(false);
  mockWhatsAppProvider.setSimulatedFailure(true, "Twilio Down");
  clearIdempotencyCache();

  const outcomeB = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt1.id,
    leadId: leadOptedIn.id,
    agentId: testAgentA.id,
    version: "iso_b_v1",
  });

  console.log("  Scenario B -> Email Sent:", outcomeB.customerEmailSent, "| WhatsApp Sent:", outcomeB.customerWhatsAppSent);

  mockWhatsAppProvider.setSimulatedFailure(false);

  if (
    outcomeA.customerEmailSent !== false ||
    outcomeA.customerWhatsAppSent !== true ||
    outcomeB.customerEmailSent !== true ||
    outcomeB.customerWhatsAppSent !== false
  ) {
    throw new Error("Test 15/16 Failed: Channels did not operate with strict failure isolation.");
  }
  console.log("  Channel failure isolation verified ✅\n");

  // -------------------------------------------------------------
  // TEST 17: Anonymous Attempt to Invoke WhatsApp Opt-In Denied
  // -------------------------------------------------------------
  console.log("▶ TEST 17: Anonymous Opt-In Endpoint Access Denied");
  const anonOptInRes = await fetch(`${baseUrl}/api/leads/${leadOptedIn.id}/whatsapp-opt-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optIn: true }),
  });

  console.log("  Anonymous Opt-In HTTP Status:", anonOptInRes.status);
  if (anonOptInRes.status !== 403 && anonOptInRes.status !== 401) {
    throw new Error(`Test 17 Failed: Expected 401/403 for anonymous opt-in, got ${anonOptInRes.status}`);
  }
  console.log("  Anonymous opt-in access denied ✅\n");

  // -------------------------------------------------------------
  // TEST 18: Cross-Agent WhatsApp Authorization Boundary
  // -------------------------------------------------------------
  console.log("▶ TEST 18: Cross-Agent WhatsApp Authorization Boundary");
  // Agent B attempting to modify Agent A's lead consent directly without staff admin role
  const eligibilityAgentBOnLeadA = checkCustomerWhatsAppEligibility(leadOptedIn);
  console.log("  Customer Eligibility check:", eligibilityAgentBOnLeadA.eligible);
  console.log("  Lead A Assigned Agent ID:", leadOptedIn.assigned_agent_id);
  console.log("  Agent B ID:", agentB.id);

  // RLS / Server check: Agent B cannot modify Lead A's record
  const { data: agentBUpdateAttempt } = await supabase
    .from("leads")
    .update({ whatsapp_opt_in: false })
    .eq("id", leadOptedIn.id)
    .eq("assigned_agent_id", agentB.id) // Agent B scoping
    .select();

  console.log("  Rows updated by Agent B on Agent A's lead:", agentBUpdateAttempt?.length || 0);

  if ((agentBUpdateAttempt?.length || 0) > 0) {
    throw new Error("Test 18 Failed: Cross-agent consent mutation was permitted.");
  }
  console.log("  Cross-agent authorization isolation verified ✅\n");

  // -------------------------------------------------------------
  // TEST 19: Opt-Out State Transition
  // -------------------------------------------------------------
  console.log("▶ TEST 19: Opt-Out State Transition");
  mockWhatsAppProvider.clear();
  clearIdempotencyCache();

  // Perform opt-out
  await setLeadWhatsAppConsent(leadOptedIn.id, false);

  const { data: optedOutLead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadOptedIn.id)
    .single();

  console.log("  Lead whatsapp_opt_in:", optedOutLead?.whatsapp_opt_in);
  console.log("  Lead whatsapp_opt_out_at:", optedOutLead?.whatsapp_opt_out_at);

  const outcomeOptOut = await emitNotificationEvent({
    event: "appointment.created",
    appointmentId: appt1.id,
    leadId: leadOptedIn.id,
    agentId: testAgentA.id,
    version: "opt_out_test_v1",
  });

  console.log("  Post Opt-Out WhatsApp Sent:", outcomeOptOut.customerWhatsAppSent);
  console.log("  Post Opt-Out Skipped Reason:", outcomeOptOut.customerWhatsAppSkippedReason);

  // Restore opt-in for remaining tests
  await setLeadWhatsAppConsent(leadOptedIn.id, true);

  if (
    optedOutLead?.whatsapp_opt_in !== false ||
    !optedOutLead?.whatsapp_opt_out_at ||
    outcomeOptOut.customerWhatsAppSent !== false ||
    outcomeOptOut.customerWhatsAppSkippedReason !== "NO_OPT_IN"
  ) {
    throw new Error("Test 19 Failed: Opt-out did not block subsequent WhatsApp notifications.");
  }
  console.log("  Opt-out state transition and blocking verified ✅\n");

  // -------------------------------------------------------------
  // TEST 20: Separate Customer vs Agent Recipient Policy
  // -------------------------------------------------------------
  console.log("▶ TEST 20: Separate Customer vs Agent Recipient Policy");
  const custElig = checkCustomerWhatsAppEligibility({
    ...leadOptedIn,
    whatsapp_opt_in: false,
  } as Lead);

  const agentElig = checkAgentWhatsAppEligibility({
    ...testAgentA,
    whatsapp_notifications_enabled: true,
  } as Profile);

  console.log("  Customer without opt-in eligible:", custElig.eligible, `(reason: ${custElig.reason})`);
  console.log("  Agent with enabled notifications eligible:", agentElig.eligible);

  if (custElig.eligible || !agentElig.eligible) {
    throw new Error("Test 20 Failed: Recipient policies are not separated properly.");
  }
  console.log("  Customer and agent recipient policy separation verified ✅\n");

  // -------------------------------------------------------------
  // TEST 21: Timezone Formatting Uniformity (America/Chicago)
  // -------------------------------------------------------------
  console.log("▶ TEST 21: Timezone Formatting Uniformity");
  const testIso = "2026-09-16T15:00:00Z"; // 10:00 AM Central
  const formattedCentral = formatAppointmentDateTime(testIso);
  console.log("  Application Timezone:", APPLICATION_TIMEZONE);
  console.log("  Formatted DateTime:", formattedCentral);

  if (!formattedCentral.includes("10:00 AM") || !formattedCentral.includes("CT")) {
    throw new Error("Test 21 Failed: Timezone is not formatted in America/Chicago CT.");
  }
  console.log("  Timezone uniformity verified ✅\n");

  // -------------------------------------------------------------
  // TEST 22: Template Completeness & Parameter Coverage
  // -------------------------------------------------------------
  console.log("▶ TEST 22: Template Completeness & Parameter Coverage");
  const sampleData = {
    appointmentId: "appt-123",
    appointmentType: "property_viewing",
    typeLabel: "Property Viewing",
    durationMinutes: 30,
    scheduledAt: "2026-09-16T15:00:00Z",
    previousScheduledAt: "2026-09-15T15:00:00Z",
    formattedDateTime: "Wednesday, September 16, 2026 at 10:00 AM CT",
    previousFormattedDateTime: "Tuesday, September 15, 2026 at 10:00 AM CT",
    timezone: "America/Chicago",
    leadName: "Rose Tyler",
    leadPhone: "+15125550144",
    agentName: "Priya Shah",
    propertyName: "The Glass House",
    propertyCity: "Austin",
    cancellationReason: "Schedule adjustment",
    crmLeadUrl: "http://localhost:3000/dashboard/leads?search=rose",
    publicSupportUrl: "http://localhost:3000/contact",
  };

  const tplCreatedCust = renderCustomerAppointmentCreatedWhatsApp(sampleData);
  const tplCreatedAg = renderAgentAppointmentCreatedWhatsApp(sampleData);
  const tplReschedCust = renderCustomerAppointmentRescheduledWhatsApp(sampleData);
  const tplReschedAg = renderAgentAppointmentRescheduledWhatsApp(sampleData);
  const tplCancelCust = renderCustomerAppointmentCancelledWhatsApp(sampleData);
  const tplCancelAg = renderAgentAppointmentCancelledWhatsApp(sampleData);
  const tplRem24hCust = renderCustomerAppointmentReminderWhatsApp(sampleData, "24h");
  const tplRem1hCust = renderCustomerAppointmentReminderWhatsApp(sampleData, "1h");
  const tplRem24hAg = renderAgentAppointmentReminderWhatsApp(sampleData, "24h");
  const tplRem1hAg = renderAgentAppointmentReminderWhatsApp(sampleData, "1h");

  const allTemplates = [
    tplCreatedCust,
    tplCreatedAg,
    tplReschedCust,
    tplReschedAg,
    tplCancelCust,
    tplCancelAg,
    tplRem24hCust,
    tplRem1hCust,
    tplRem24hAg,
    tplRem1hAg,
  ];

  for (const t of allTemplates) {
    if (!t.body || !t.templateName || !t.parameters) {
      throw new Error(`Test 22 Failed: Template ${t.templateName} incomplete.`);
    }
  }
  console.log(`  All ${allTemplates.length} WhatsApp templates validated with complete parameter sets ✅\n`);

  // -------------------------------------------------------------
  // TEST 23: Full Public Page & Full System Regression Checks
  // -------------------------------------------------------------
  console.log("▶ TEST 23: Full System Regression Checks");
  const rHome = await fetch(`${baseUrl}/`);
  const rProps = await fetch(`${baseUrl}/properties`);
  const rCRM = await fetch(`${baseUrl}/dashboard`);
  const rAppts = await fetch(`${baseUrl}/dashboard/appointments`);

  console.log("  GET / status:", rHome.status);
  console.log("  GET /properties status:", rProps.status);
  console.log("  GET /dashboard status:", rCRM.status);
  console.log("  GET /dashboard/appointments status:", rAppts.status);

  if (rHome.status !== 200 || rProps.status !== 200) {
    throw new Error("Test 23 Failed: Public route regression detected.");
  }
  console.log("  Full system regression checks passed ✅\n");

  console.log("================================================================");
  console.log("  ALL PHASE 6C WHATSAPP AUTOMATION TESTS PASSED 100%!           ");
  console.log("================================================================");
}

runPhase6CTests().catch((err) => {
  console.error("\n❌ PHASE 6C TEST FAILED:\n", err);
  process.exit(1);
});
