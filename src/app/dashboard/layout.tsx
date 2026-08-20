import { requireStaff } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { hasPublicEnv } from "@/lib/env";
import { MissingEnvNotice } from "@/components/shared/missing-env-notice";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!hasPublicEnv()) {
    return <MissingEnvNotice />;
  }

  const { profile } = await requireStaff();

  return (
    <AppShell profile={profile} title="Staff Portal — Aether Estates">
      {children}
    </AppShell>
  );
}
