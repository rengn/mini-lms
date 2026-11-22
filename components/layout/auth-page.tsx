import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AuthPage({ children }: { children: ReactNode }) {
  return (
    <main
      className={cn(
        "flex w-full flex-1 items-center justify-center p-4 sm:p-6 md:p-10",
      )}
    >
      {children}
    </main>
  );
}
