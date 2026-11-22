import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AuthenticatedUser {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  if (error || !userId) {
    return null;
  }

  return { supabase, userId };
}

export async function getUserRole({ supabase, userId }: AuthenticatedUser) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error("Could not load user role.", { cause: error });
  }

  return data.role;
}
