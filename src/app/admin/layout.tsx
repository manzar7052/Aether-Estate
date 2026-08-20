import { requireAdmin } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { hasPublicEnv } from "@/lib/env";
import { MissingEnvNotice } from "@/components/shared/missing-env-notice";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!hasPublicEnv()) {
    return <MissingEnvNotice />;
  }

  const { profile } = await requireAdmin();

  return (
    <AppShell profile={profile} title="Admin Portal — Executive Oversight">
      {children}
    </AppShell>
  );
}
