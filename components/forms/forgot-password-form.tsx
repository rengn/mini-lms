"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { forgotPasswordFormSchema } from "@/lib/validation/forms";

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const form = useForm<z.input<typeof forgotPasswordFormSchema>>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: "" },
  });

  const handleForgotPassword = form.handleSubmit(async ({ email }) => {
    try {
      const supabase = createClient();
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      form.setError("root.server", {
        message: error instanceof Error ? error.message : "An error occurred",
      });
    }
  });

  return success ? (
    <Card className={cn("w-full max-w-sm")}>
      <CardHeader>
        <CardTitle className={cn("text-2xl")}>Check Your Email</CardTitle>
        <CardDescription>Password reset instructions sent</CardDescription>
      </CardHeader>
      <CardContent>
        <p className={cn("text-sm text-muted-foreground")}>
          If you registered using your email and password, you will receive a
          password reset email.
        </p>
      </CardContent>
    </Card>
  ) : (
    <Card className={cn("w-full max-w-sm")}>
      <CardHeader>
        <CardTitle className={cn("text-2xl")}>Reset Your Password</CardTitle>
        <CardDescription>
          Type in your email and we&apos;ll send you a link to reset your
          password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          noValidate
          onSubmit={(event) => {
            void handleForgotPassword(event);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                aria-invalid={Boolean(form.formState.errors.email)}
                aria-describedby={
                  form.formState.errors.email ? "forgot-email-error" : undefined
                }
                {...form.register("email")}
              />
              <FieldError id="forgot-email-error">
                {form.formState.errors.email?.message}
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
              {form.formState.isSubmitting ? "Sending..." : "Send reset email"}
            </Button>
          </FieldGroup>
          <p className={cn("mt-4 text-center text-sm")}>
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className={cn("underline underline-offset-4")}
            >
              Login
            </Link>
          </p>
        </Form>
      </CardContent>
    </Card>
  );
}
