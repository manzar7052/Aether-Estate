import { Card } from "@/components/ui/card";

export function MissingEnvNotice() {
  return (
    <div className="flex min-h-full items-center justify-center bg-brand-cream px-6">
      <Card className="max-w-lg space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-gold">
          Configuration
        </p>
        <h1 className="font-serif text-3xl text-brand-ink">
          Environment variables are missing
        </h1>
        <p className="text-sm leading-6 text-brand-ink/70">
          Copy <code className="rounded bg-brand-sand px-1.5 py-0.5">.env.example</code>{" "}
          to <code className="rounded bg-brand-sand px-1.5 py-0.5">.env.local</code>{" "}
          and set <strong>NEXT_PUBLIC_SUPABASE_URL</strong> and{" "}
          <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong>. Restart the dev server
          after saving. Server-only secrets such as{" "}
          <strong>SUPABASE_SERVICE_ROLE_KEY</strong> must never use the{" "}
          <code className="rounded bg-brand-sand px-1.5 py-0.5">NEXT_PUBLIC_</code>{" "}
          prefix.
        </p>
      </Card>
    </div>
  );
}
