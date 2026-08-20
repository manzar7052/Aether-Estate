import { LoginForm } from "@/components/shared/login-form";

export default function LoginPage() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-brand-gold">
        Welcome back
      </p>
      <h1 className="mt-2 font-serif text-3xl text-brand-ink">Sign in</h1>
      <p className="mb-8 mt-2 text-sm text-brand-ink/60">
        Access the admin portal or your agent workspace.
      </p>
      <LoginForm />
    </>
  );
}
