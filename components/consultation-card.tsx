"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { patchConsultation } from "@/lib/clients/consultations";
import {
  cn,
  formatScheduledAt,
  getLocalDateTimeMinimum,
  toFutureISOString,
} from "@/lib/utils";
import {
  type Consultation,
  type UpdateConsultationInput,
} from "@/lib/validation/consultation";
import { consultationRescheduleFormSchema } from "@/lib/validation/forms";

interface ConsultationCardProps {
  consultation: Consultation;
  isUpcoming: boolean;
  actionsDisabled: boolean;
  onActionStart: () => void;
  onUpdated: (message: string) => void;
}

const noLongerUpcoming =
  "This consultation is no longer upcoming and cannot be rescheduled or cancelled.";

export function ConsultationCard({
  consultation,
  isUpcoming,
  actionsDisabled,
  onActionStart,
  onUpdated,
}: ConsultationCardProps) {
  const useLocalTime = useIsHydrated();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [minimumScheduledAt, setMinimumScheduledAt] = useState<string>();
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    UpdateConsultationInput["action"] | null
  >(null);
  const pendingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rescheduleForm = useForm<
    z.input<typeof consultationRescheduleFormSchema>
  >({
    resolver: zodResolver(consultationRescheduleFormSchema),
    defaultValues: { scheduledAt: "" },
  });

  const isPending = pendingAction !== null;
  const canManage = consultation.status === "scheduled" && isUpcoming;
  const formattedTime = formatScheduledAt(
    consultation.scheduledAt,
    useLocalTime,
  );
  function restoreFocusIfNeeded(event: Event) {
    if (!canManage) {
      event.preventDefault();
      headingRef.current?.focus();
    }
  }

  function handleRescheduleOpenChange(nextOpen: boolean) {
    if (pendingRef.current) {
      return;
    }

    setRescheduleOpen(nextOpen);
    if (nextOpen) {
      setMinimumScheduledAt(getLocalDateTimeMinimum(Date.now()));
      setRescheduleError(null);
      setCompletionError(null);
      rescheduleForm.reset({ scheduledAt: "" });
      onActionStart();
    }
  }

  function handleCancelOpenChange(nextOpen: boolean) {
    if (pendingRef.current) {
      return;
    }

    setCancelOpen(nextOpen);
    if (nextOpen) {
      setCancelError(null);
      setCompletionError(null);
      onActionStart();
    }
  }

  async function applyUpdate(
    input: UpdateConsultationInput,
    message: string,
    onError: (message: string) => void,
  ) {
    if (pendingRef.current || actionsDisabled) {
      return false;
    }

    pendingRef.current = true;
    setPendingAction(input.action);
    setCompletionError(null);
    onActionStart();

    try {
      await patchConsultation(consultation.id, input);
      onUpdated(message);
      return true;
    } catch (error: unknown) {
      onError(
        error instanceof Error
          ? error.message
          : "Could not update the consultation. Please try again.",
      );
      return false;
    } finally {
      pendingRef.current = false;
      setPendingAction(null);
    }
  }

  async function handleMarkComplete() {
    await applyUpdate(
      {
        action: "setStatus",
        status: "completed",
        updatedAt: consultation.updatedAt,
      },
      "Consultation marked complete.",
      setCompletionError,
    );
  }

  async function submitReschedule({
    scheduledAt,
  }: z.input<typeof consultationRescheduleFormSchema>) {
    setRescheduleError(null);

    try {
      if (Date.parse(consultation.scheduledAt) <= Date.now()) {
        throw new Error(noLongerUpcoming);
      }

      const updated = await applyUpdate(
        {
          action: "reschedule",
          scheduledAt: toFutureISOString(scheduledAt),
          updatedAt: consultation.updatedAt,
        },
        "Consultation rescheduled.",
        setRescheduleError,
      );

      if (updated) {
        setRescheduleOpen(false);
      }
    } catch (error: unknown) {
      setRescheduleError(
        error instanceof Error
          ? error.message
          : "Could not reschedule the consultation. Please try again.",
      );
    }
  }

  async function handleCancel() {
    setCancelError(null);

    if (Date.parse(consultation.scheduledAt) <= Date.now()) {
      setCancelError(noLongerUpcoming);
      return;
    }

    const updated = await applyUpdate(
      { action: "cancel", updatedAt: consultation.updatedAt },
      "Consultation cancelled.",
      setCancelError,
    );

    if (updated) {
      setCancelOpen(false);
    }
  }

  return (
    <Card>
      <CardContent className={cn("space-y-4 py-5")}>
        <div
          className={cn(
            "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          )}
        >
          <div className={cn("min-w-0 space-y-2")}>
            <div className={cn("flex flex-wrap items-center gap-2")}>
              <h3
                ref={headingRef}
                className={cn("break-words font-medium")}
                tabIndex={-1}
              >
                {consultation.firstName} {consultation.lastName}
              </h3>
              {consultation.status !== "scheduled" && (
                <Badge
                  className={cn("capitalize")}
                  variant={
                    consultation.status === "cancelled" ? "outline" : "default"
                  }
                >
                  {consultation.status}
                </Badge>
              )}
            </div>
            <p className={cn("text-sm text-muted-foreground")}>
              <time dateTime={consultation.scheduledAt}>{formattedTime}</time>
            </p>
            <p className={cn("whitespace-pre-wrap break-words text-sm")}>
              {consultation.reason}
            </p>
          </div>
          <div
            className={cn(
              "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end",
            )}
          >
            {consultation.status === "scheduled" && (
              <Button
                type="button"
                variant="outline"
                disabled={isPending || actionsDisabled}
                onClick={() => {
                  void handleMarkComplete();
                }}
              >
                {pendingAction === "setStatus" ? "Saving..." : "Mark complete"}
              </Button>
            )}
            <Dialog
              open={rescheduleOpen}
              onOpenChange={handleRescheduleOpenChange}
            >
              {canManage && (
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending || actionsDisabled}
                  >
                    Reschedule
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent
                showCloseButton={!isPending}
                onCloseAutoFocus={restoreFocusIfNeeded}
              >
                <DialogHeader>
                  <DialogTitle>Reschedule consultation</DialogTitle>
                  <DialogDescription>
                    Currently scheduled for{" "}
                    <time dateTime={consultation.scheduledAt}>
                      {formattedTime}
                    </time>
                    . Choose a new date and time.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className={cn("min-w-0")}
                  noValidate
                  onSubmit={(event) => {
                    void rescheduleForm.handleSubmit(submitReschedule)(event);
                  }}
                >
                  <fieldset
                    className={cn("min-w-0 space-y-4")}
                    disabled={isPending}
                  >
                    <div className={cn("space-y-2")}>
                      <Label htmlFor={`reschedule-${consultation.id}`}>
                        New date and time
                      </Label>
                      <Input
                        id={`reschedule-${consultation.id}`}
                        className={cn("min-w-0")}
                        type="datetime-local"
                        min={minimumScheduledAt}
                        aria-invalid={Boolean(
                          rescheduleForm.formState.errors.scheduledAt,
                        )}
                        {...rescheduleForm.register("scheduledAt")}
                      />
                      {rescheduleForm.formState.errors.scheduledAt && (
                        <p
                          className={cn("text-sm text-destructive")}
                          role="alert"
                        >
                          {rescheduleForm.formState.errors.scheduledAt.message}
                        </p>
                      )}
                    </div>
                    {(rescheduleError !== null || !canManage) && (
                      <p
                        className={cn("text-sm text-destructive")}
                        role="alert"
                      >
                        {rescheduleError ?? noLongerUpcoming}
                      </p>
                    )}
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Close
                        </Button>
                      </DialogClose>
                      <Button
                        type="submit"
                        disabled={!canManage || actionsDisabled}
                      >
                        {pendingAction === "reschedule"
                          ? "Saving..."
                          : "Save new time"}
                      </Button>
                    </DialogFooter>
                  </fieldset>
                </form>
              </DialogContent>
            </Dialog>
            <AlertDialog
              open={cancelOpen}
              onOpenChange={handleCancelOpenChange}
            >
              {canManage && (
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending || actionsDisabled}
                  >
                    Cancel
                  </Button>
                </AlertDialogTrigger>
              )}
              <AlertDialogContent onCloseAutoFocus={restoreFocusIfNeeded}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this consultation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your consultation on{" "}
                    <time dateTime={consultation.scheduledAt}>
                      {formattedTime}
                    </time>{" "}
                    will be cancelled. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {(cancelError !== null || !canManage) && (
                  <p className={cn("text-sm text-destructive")} role="alert">
                    {cancelError ?? noLongerUpcoming}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>
                    Keep consultation
                  </AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isPending || !canManage || actionsDisabled}
                    onClick={() => {
                      void handleCancel();
                    }}
                  >
                    {pendingAction === "cancel"
                      ? "Cancelling..."
                      : "Cancel consultation"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {completionError && (
          <p className={cn("text-sm text-destructive")} role="alert">
            {completionError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
