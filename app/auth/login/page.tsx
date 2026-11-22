import { Suspense } from "react";

import { LoginForm } from "@/components/forms/login-form";
import { AuthPage } from "@/components/layout/auth-page";
import { GuestOnly } from "@/components/routing/guest-only";

export default function Page() {
  return (
    <AuthPage>
      <Suspense>
        <GuestOnly>
          <LoginForm />
        </GuestOnly>
      </Suspense>
    </AuthPage>
  );
}
