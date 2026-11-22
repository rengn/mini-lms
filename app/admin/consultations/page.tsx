import { Suspense } from "react";

import { Dashboard } from "@/components/admin/dashboard";
import { RoleOnly } from "@/components/routing/role-only";
import { Loader } from "@/components/ui/loader";
import type { AuthenticatedUser } from "@/lib/dal/auth";
import { listConsultations } from "@/lib/dal/consultations";
import { cn } from "@/lib/utils";

async function AdminDashboard({ user }: { user: AuthenticatedUser }) {
  const consultations = await listConsultations(user);

  return (
    <main className={cn("mx-auto w-full max-w-5xl px-5 py-10")}>
      <Dashboard consultations={consultations} />
    </main>
  );
}

export default function AdminConsultationsPage() {
  return (
    <Suspense fallback={<Loader />}>
      <RoleOnly role="admin">
        {(user) => <AdminDashboard user={user} />}
      </RoleOnly>
    </Suspense>
  );
}
