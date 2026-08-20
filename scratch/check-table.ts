import { createServiceRoleClient } from "../src/lib/supabase/admin";

async function check() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("appointment_reminders")
    .select("id")
    .limit(1);

  console.log("appointment_reminders check:", { data, error });
}

check();
