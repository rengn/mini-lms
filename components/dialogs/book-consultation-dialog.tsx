"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { postConsultation } from "@/lib/clients/consultations";
import { cn, getLocalDateTimeMinimum, toFutureISOString } from "@/lib/utils";
import { consultationFormSchema } from "@/lib/validation/forms";

interface BookConsultationDialogProps {
  actionsDisabled: boolean;
  onActionStart: () => void;
  onBooked: () => void;
}

export function BookConsultationDialog({
  actionsDisabled,
  onActionStart,
  onBooked,
}: BookConsultationDialogProps) {
  const [open, setOpen] = useState(false);
  const [minimumScheduledAt, setMinimumScheduledAt] = useState<string>();
  const pendingRef = useRef(false);
  const form = useForm<z.input<typeof consultationFormSchema>>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      reason: "",
      scheduledAt: "",
    },
  });
  const isBooking = form.formState.isSubmitting;

  function handleOpenChange(nextOpen: boolean) {
    if (pendingRef.current) {
      return;
    }

    setOpen(nextOpen);
    if (nextOpen) {
      setMinimumScheduledAt(getLocalDateTimeMinimum(Date.now()));
      form.clearErrors();
      onActionStart();
    }
  }

  async function submitBooking(values: z.input<typeof consultationFormSchema>) {
    if (pendingRef.current || actionsDisabled) {
      return;
    }

    pendingRef.current = true;
    form.clearErrors("root.server");
    onActionStart();

    try {
      await postConsultation({
        firstName: values.firstName,
        lastName: values.lastName,
        reason: values.reason,
        scheduledAt: toFutureISOString(values.scheduledAt),
      });

      form.reset();
      setOpen(false);
      onBooked();
    } catch (bookingError: unknown) {
      form.setError("root.server", {
        message:
          bookingError instanceof Error
            ? bookingError.message
            : "Could not book the consultation. Please try again.",
      });
    } finally {
      pendingRef.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className={cn("w-full sm:w-auto")} disabled={actionsDisabled}>
          Book a consultation
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={!isBooking}>
        <DialogHeader>
          <DialogTitle>Book a consultation</DialogTitle>
          <DialogDescription>
            Choose a time and tell us what you would like to discuss.
          </DialogDescription>
        </DialogHeader>
        <form
          className={cn("min-w-0")}
          noValidate
          onSubmit={(event) => {
            void form.handleSubmit(submitBooking)(event);
          }}
        >
          <fieldset className={cn("min-w-0 space-y-4")} disabled={isBooking}>
            <div className={cn("grid gap-4 sm:grid-cols-2")}>
              <div className={cn("space-y-2")}>
                <Label htmlFor="first-name">First name</Label>
                <Input
                  id="first-name"
                  maxLength={100}
                  aria-invalid={Boolean(form.formState.errors.firstName)}
                  {...form.register("firstName")}
                />
                {form.formState.errors.firstName && (
                  <p className={cn("text-sm text-destructive")} role="alert">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className={cn("space-y-2")}>
                <Label htmlFor="last-name">Last name</Label>
                <Input
                  id="last-name"
                  maxLength={100}
                  aria-invalid={Boolean(form.formState.errors.lastName)}
                  {...form.register("lastName")}
                />
                {form.formState.errors.lastName && (
                  <p className={cn("text-sm text-destructive")} role="alert">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div className={cn("space-y-2")}>
              <Label htmlFor="consultation-reason">Reason</Label>
              <Textarea
                id="consultation-reason"
                maxLength={1000}
                rows={4}
                aria-invalid={Boolean(form.formState.errors.reason)}
                {...form.register("reason")}
              />
              {form.formState.errors.reason && (
                <p className={cn("text-sm text-destructive")} role="alert">
                  {form.formState.errors.reason.message}
                </p>
              )}
            </div>
            <div className={cn("space-y-2")}>
              <Label htmlFor="scheduled-at">Date and time</Label>
              <Input
                id="scheduled-at"
                className={cn("min-w-0")}
                type="datetime-local"
                min={minimumScheduledAt}
                aria-invalid={Boolean(form.formState.errors.scheduledAt)}
                {...form.register("scheduledAt")}
              />
              {form.formState.errors.scheduledAt && (
                <p className={cn("text-sm text-destructive")} role="alert">
                  {form.formState.errors.scheduledAt.message}
                </p>
              )}
            </div>
            {form.formState.errors.root?.server && (
              <p className={cn("text-sm text-destructive")} role="alert">
                {form.formState.errors.root.server.message}
              </p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DialogClose>
              <Button type="submit" disabled={actionsDisabled}>
                {isBooking ? "Booking..." : "Book consultation"}
              </Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
