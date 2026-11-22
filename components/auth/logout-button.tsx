"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LogoutButton() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Full navigation drops client router cache entries prefetched under the previous auth state.
      window.location.replace("/auth/login");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2")}>
      <Button
        disabled={isLoading}
        onClick={() => {
          void logout();
        }}
      >
        {isLoading ? "Logging out..." : "Logout"}
      </Button>
      {error && (
        <p role="alert" className={cn("text-sm text-red-500")}>
          {error}
        </p>
      )}
    </div>
  );
}
