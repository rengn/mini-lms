"use client";

import { ConsultationCard } from "@/components/consultation-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Consultation } from "@/lib/validation/consultation";

interface ConsultationListProps {
  consultations: Consultation[];
  loadedAt: number;
  actionsDisabled: boolean;
  onActionStart: () => void;
  onUpdated: (message: string) => void;
}

export function ConsultationList({
  consultations,
  loadedAt,
  actionsDisabled,
  onActionStart,
  onUpdated,
}: ConsultationListProps) {
  return (
    <section
      aria-labelledby="consultations-heading"
      className={cn("space-y-4")}
    >
      <header className={cn("flex items-center justify-between gap-4")}>
        <CardTitle
          id="consultations-heading"
          role="heading"
          aria-level={2}
          className={cn("text-xl font-semibold leading-7")}
        >
          Your sessions
        </CardTitle>
        <CardDescription className={cn("shrink-0")}>
          {consultations.length} total
        </CardDescription>
      </header>

      {consultations.length === 0 ? (
        <Card>
          <CardContent
            className={cn("py-8 text-center text-sm text-muted-foreground")}
          >
            You don&apos;t have any consultations yet.
          </CardContent>
        </Card>
      ) : (
        <ul className={cn("space-y-3")}>
          {consultations.map((consultation) => (
            <li key={consultation.id}>
              <ConsultationCard
                consultation={consultation}
                isUpcoming={Date.parse(consultation.scheduledAt) > loadedAt}
                actionsDisabled={actionsDisabled}
                onActionStart={onActionStart}
                onUpdated={onUpdated}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
