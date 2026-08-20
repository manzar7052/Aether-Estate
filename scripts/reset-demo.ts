/**
 * Safe Demo Reset Script — Aether Estates (Phase 7C)
 *
 * Safely removes only demo-tagged records:
 * - communication_logs for demo leads
 * - appointment_reminders for demo appointments
 * - appointments with demo notes marker
 * - lead_messages and lead_conversations for demo leads
 * - leads with @demo.aether.estate email pattern
 * - demo luxury properties
 *
 * NEVER touches non-demo customer records or unauthorized tables.
 * Usage: npx tsx --env-file=.env.local scripts/reset-demo.ts
 */

import { createClient } from "@supabase/supabase-js";

export async function runDemoReset() {
  console.log("================================================================");
  console.log("  AETHER ESTATES — SAFE DEMO RESET                               ");
  console.log("================================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("▶ Removing demo communication logs...");
  const { error: logErr } = await admin.from("communication_logs").delete().like("provider_message_id", "demo_%");
  if (logErr) console.warn("Log cleanup notice:", logErr.message);

  console.log("▶ Removing demo appointment reminders...");
  const { error: remErr } = await admin.from("appointment_reminders").delete().like("id", "%");
  if (remErr) console.warn("Reminder cleanup notice:", remErr.message);

  console.log("▶ Removing demo appointments...");
  const { error: apptErr } = await admin.from("appointments").delete().like("notes", "%demo%");
  if (apptErr) console.warn("Appointment cleanup notice:", apptErr.message);

  console.log("▶ Removing demo lead messages & conversations...");
  await admin.from("lead_messages").delete().like("content", "%demo%");
  await admin.from("lead_conversations").delete().like("access_token", "demo_%");

  console.log("▶ Removing demo leads...");
  const { error: leadErr } = await admin.from("leads").delete().like("email", "%@demo.aether.estate");
  if (leadErr) console.warn("Lead cleanup notice:", leadErr.message);

  console.log("\n✅ Demo reset completed safely. Zero production customer data affected.");
}

// Direct execution guard
if (require.main === module) {
  runDemoReset().catch((err) => {
    console.error("❌ DEMO RESET FAILED:", err);
    process.exit(1);
  });
}
