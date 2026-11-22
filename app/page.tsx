import { Suspense } from "react";

import { RoleRedirect } from "@/components/routing/role-only";
import { Loader } from "@/components/ui/loader";

export default function Home() {
  return (
    <Suspense fallback={<Loader />}>
      <RoleRedirect />
    </Suspense>
  );
}
