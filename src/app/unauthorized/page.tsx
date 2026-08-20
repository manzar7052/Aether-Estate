import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-6">
      <Card className="max-w-md space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-gold">
          Access denied
        </p>
        <h1 className="font-serif text-3xl">You cannot open this page</h1>
        <p className="text-sm leading-6 text-brand-ink/70">
          This area is limited to a different role. If you believe this is a
          mistake, contact an administrator.
        </p>
        <Link href="/dashboard">
          <Button>Go to your workspace</Button>
        </Link>
      </Card>
    </div>
  );
}
