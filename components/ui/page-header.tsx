import type { ReactNode } from "react";

import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
      )}
    >
      <CardHeader className={cn("min-w-0 gap-2 space-y-0 p-0")}>
        <CardTitle
          role="heading"
          aria-level={1}
          className={cn("text-3xl font-semibold leading-9")}
        >
          {title}
        </CardTitle>
        <CardDescription className={cn("text-base")}>
          {description}
        </CardDescription>
      </CardHeader>
      {actions}
    </header>
  );
}
