import { Logo } from "@/components/layout/logo";
import { Card } from "@/components/ui/card";
import { hasPublicEnv } from "@/lib/env";
import { MissingEnvNotice } from "@/components/shared/missing-env-notice";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  if (!hasPublicEnv()) {
    return <MissingEnvNotice />;
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  );
}
