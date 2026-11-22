import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getAuthenticatedUser } from "@/lib/dal/auth";

export async function GuestOnly({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/");
  }

  return children;
}
