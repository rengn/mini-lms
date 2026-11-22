"use client";

import { useRef, useState } from "react";

import { getConsultations } from "@/lib/clients/consultations";
import type { Consultation } from "@/lib/validation/consultation";

export function useStudentConsultations(
  initialConsultations: Consultation[],
  initialLoadedAt: number,
) {
  const [list, setList] = useState({
    consultations: initialConsultations,
    loadedAt: initialLoadedAt,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshSequence = useRef(0);

  async function refreshConsultations() {
    const requestId = ++refreshSequence.current;
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const latestConsultations = await getConsultations();
      if (requestId === refreshSequence.current) {
        setList({ consultations: latestConsultations, loadedAt: Date.now() });
      }
    } catch (error: unknown) {
      if (requestId === refreshSequence.current) {
        const reason =
          error instanceof Error ? error.message : "Please try again.";
        setRefreshError(
          `Your changes were saved, but the consultation list could not be refreshed. ${reason}`,
        );
      }
    } finally {
      if (requestId === refreshSequence.current) {
        setIsRefreshing(false);
      }
    }
  }

  function handleBooked() {
    setFeedback("Your consultation has been booked.");
    void refreshConsultations();
  }

  function handleUpdated(message: string) {
    setFeedback(message);
    void refreshConsultations();
  }

  function clearFeedback() {
    setFeedback(null);
  }

  return {
    consultations: list.consultations,
    loadedAt: list.loadedAt,
    feedback,
    refreshError,
    isRefreshing,
    handleBooked,
    handleUpdated,
    clearFeedback,
    refreshConsultations,
  };
}
