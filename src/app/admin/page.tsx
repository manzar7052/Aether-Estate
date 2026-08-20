import { requireAdmin } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";

export default async function AdminPage() {
  const { profile } = await requireAdmin();

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <Card>
        <h1 className="font-serif text-3xl text-brand-ink">Admin Portal — Phase 1</h1>
        <p className="mt-3 text-sm leading-6 text-brand-ink/70">
          Phase 1 foundation is ready. CRM, analytics, and property tools land
          in later phases.
        </p>
      </Card>
      <Card className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-brand-ink/50">
          Signed in
        </h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-brand-ink/50">Name</dt>
            <dd className="text-brand-ink">{profile.full_name}</dd>
          </div>
          <div>
            <dt className="text-brand-ink/50">Email</dt>
            <dd className="text-brand-ink">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-brand-ink/50">Role</dt>
            <dd className="capitalize text-brand-ink">{profile.role}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
