import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function Loader() {
  return (
    <section
      role="status"
      aria-label="Loading"
      className={cn("flex h-full w-full flex-1 items-center justify-center")}
    >
      <LoaderCircle
        className={cn(
          "h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none",
        )}
        aria-hidden="true"
      />
    </section>
  );
}
