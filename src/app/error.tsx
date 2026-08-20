"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-full items-center justify-center bg-brand-cream px-6">
      <Card className="max-w-md space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-gold">
          Something went wrong
        </p>
        <h1 className="font-serif text-3xl">We could not complete that request</h1>
        <p className="text-sm text-brand-ink/70">
          {error.name === "EnvError"
            ? error.message
            : "Try again. If this continues, check the server logs."}
        </p>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
