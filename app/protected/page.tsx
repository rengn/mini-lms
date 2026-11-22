import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

async function Dashboard() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
    </main>
  );
}

export default function ProtectedPage() {
  return (
    <Suspense fallback={<p className="p-5">Loading dashboard...</p>}>
      <Dashboard />
    </Suspense>
  );
}
