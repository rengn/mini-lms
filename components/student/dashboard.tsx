"use client";

import { ConsultationList } from "@/components/consultation-list";
import { BookConsultationDialog } from "@/components/dialogs/book-consultation-dialog";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { useStudentConsultations } from "@/hooks/use-student-consultations";
import { cn } from "@/lib/utils";
import type { Consultation } from "@/lib/validation/consultation";

export function Dashboard({
  initialConsultations,
  initialLoadedAt,
}: {
  initialConsultations: Consultation[];
  initialLoadedAt: number;
}) {
  const {
    consultations,
    loadedAt,
    feedback,
    refreshError,
    isRefreshing,
    handleBooked,
    handleUpdated,
    clearFeedback,
    refreshConsultations,
  } = useStudentConsultations(initialConsultations, initialLoadedAt);
  const actionsDisabled = isRefreshing || refreshError !== null;

  return (
    <section aria-label="Student consultations" className={cn("space-y-8")}>
      <PageHeader
        title="My consultations"
        description="Book a session and keep track of your upcoming consultations."
        actions={
          <BookConsultationDialog
            actionsDisabled={actionsDisabled}
            onActionStart={clearFeedback}
            onBooked={handleBooked}
          />
        }
      />

      {feedback && <CardDescription role="status">{feedback}</CardDescription>}

      {isRefreshing && (
        <CardDescription role="status">
          Refreshing consultations...
        </CardDescription>
      )}

      {refreshError && (
        <>
          <FieldError>{refreshError}</FieldError>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void refreshConsultations();
            }}
          >
            Retry refresh
          </Button>
        </>
      )}

      <ConsultationList
        consultations={consultations}
        loadedAt={loadedAt}
        actionsDisabled={actionsDisabled}
        onActionStart={clearFeedback}
        onUpdated={handleUpdated}
      />
    </section>
  );
}
