"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthActionState = { error: null, notice: null };

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className="text-sm text-brand-ink/80" role="status">
          {state.notice}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create agent account"}
      </Button>
      <p className="text-center text-sm text-brand-ink/60">
        Already registered?{" "}
        <Link href="/login" className="text-brand-ink underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
