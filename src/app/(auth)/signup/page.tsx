import { SignupForm } from "@/components/shared/signup-form";

export default function SignupPage() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-brand-gold">
        New agent
      </p>
      <h1 className="mt-2 font-serif text-3xl text-brand-ink">Create account</h1>
      <p className="mb-8 mt-2 text-sm text-brand-ink/60">
        Signups are created as agents. Admin access is granted separately.
      </p>
      <SignupForm />
    </>
  );
}
