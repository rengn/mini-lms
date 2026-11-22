import { Suspense } from "react";

import { SignUpForm } from "@/components/forms/sign-up-form";
import { AuthPage } from "@/components/layout/auth-page";
import { GuestOnly } from "@/components/routing/guest-only";

export default function Page() {
  return (
    <AuthPage>
      <Suspense>
        <GuestOnly>
          <SignUpForm />
        </GuestOnly>
      </Suspense>
    </AuthPage>
  );
}
