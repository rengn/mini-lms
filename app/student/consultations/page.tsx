import { connection } from "next/server";
import { Suspense } from "react";

import { RoleOnly } from "@/components/routing/role-only";
import { Dashboard } from "@/components/student/dashboard";
import { Loader } from "@/components/ui/loader";
import type { AuthenticatedUser } from "@/lib/dal/auth";
import { listConsultations } from "@/lib/dal/consultations";
import { cn } from "@/lib/utils";

async function loadConsultations(user: AuthenticatedUser) {
  await connection();
  const consultations = await listConsultations(user);
  return { consultations, loadedAt: Date.now() };
}

async function StudentDashboard({ user }: { user: AuthenticatedUser }) {
  const { consultations, loadedAt } = await loadConsultations(user);

  return (
    <main className={cn("mx-auto w-full max-w-5xl px-5 py-10")}>
      <Dashboard
        initialConsultations={consultations}
        initialLoadedAt={loadedAt}
      />
    </main>
  );
}

export default function StudentConsultationsPage() {
  return (
    <Suspense fallback={<Loader />}>
      <RoleOnly role="student">
        {(user) => <StudentDashboard user={user} />}
      </RoleOnly>
    </Suspense>
  );
}
