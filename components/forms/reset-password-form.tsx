"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { type z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { resetPasswordFormSchema } from "@/lib/validation/forms";

export function ResetPasswordForm() {
  const form = useForm<z.input<typeof resetPasswordFormSchema>>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: "" },
  });

  const handleResetPassword = form.handleSubmit(async ({ password }) => {
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }
      // Full navigation drops client router cache entries prefetched under the previous auth state.
      window.location.replace("/");
    } catch (error: unknown) {
      form.setError("root.server", {
        message: error instanceof Error ? error.message : "An error occurred",
      });
    }
  });

  return (
    <Card className={cn("w-full max-w-sm")}>
      <CardHeader>
        <CardTitle className={cn("text-2xl")}>Reset Your Password</CardTitle>
        <CardDescription>Please enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          noValidate
          onSubmit={(event) => {
            void handleResetPassword(event);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <PasswordInput
                id="password"
                visibilityLabel="new password"
                placeholder="New password"
                autoComplete="new-password"
                aria-invalid={Boolean(form.formState.errors.password)}
                aria-describedby={
                  form.formState.errors.password
                    ? "reset-password-error"
                    : undefined
                }
                {...form.register("password")}
              />
              <FieldError id="reset-password-error">
                {form.formState.errors.password?.message}
              </FieldError>
            </Field>
            {form.formState.errors.root?.server && (
              <FieldError>
                {form.formState.errors.root.server.message}
              </FieldError>
            )}
            <Button
              type="submit"
              className={cn("w-full")}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Saving..." : "Save new password"}
            </Button>
          </FieldGroup>
        </Form>
      </CardContent>
    </Card>
  );
}
