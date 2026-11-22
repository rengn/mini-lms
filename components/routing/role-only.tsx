import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  type AuthenticatedUser,
  getAuthenticatedUser,
  getUserRole,
} from "@/lib/dal/auth";

type UserRole = Awaited<ReturnType<typeof getUserRole>>;

const roleHome: Record<UserRole, string> = {
  admin: "/admin/consultations",
  student: "/student/consultations",
};

async function getAuthenticatedUserAndRole() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login");
  }

  return { user, role: await getUserRole(user) };
}

export async function RoleRedirect() {
  const { role } = await getAuthenticatedUserAndRole();
  return redirect(roleHome[role]);
}

export async function RoleOnly({
  role,
  children,
}: {
  role: UserRole;
  children: (user: AuthenticatedUser) => ReactNode;
}) {
  const { user, role: userRole } = await getAuthenticatedUserAndRole();

  if (userRole !== role) {
    redirect(roleHome[userRole]);
  }

  return children(user);
}
