import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { LogoutButton } from "./logout-button";

export async function AccountControls() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  if (!user) {
    return null;
  }

  return (
    <Card
      className={cn(
        "flex min-w-0 items-center gap-2 border-0 bg-transparent text-foreground shadow-none sm:gap-4",
      )}
    >
      <CardContent className={cn("min-w-0 truncate p-0")}>
        Hey, {user.email}!
      </CardContent>
      <LogoutButton />
    </Card>
  );
}
