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
import { PasswordInput } from "@/components/ui/password-input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { signUpFormSchema } from "@/lib/validation/forms";

export function SignUpForm() {
  const form = useForm<z.input<typeof signUpFormSchema>>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { email: "", password: "", repeatPassword: "" },
  });
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );

  const handleSignUp = form.handleSubmit(async ({ email, password }) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        throw error;
      }
      // No session means the project requires email confirmation (e.g. hosted Supabase defaults).
      if (!data.session) {
        setConfirmationEmail(email);
        return;
      }
      // Complete navigation drops router cache entries prefetched when unauthenticated
      window.location.replace("/");
    } catch (error: unknown) {
      form.setError("root.server", {
        message: error instanceof Error ? error.message : "An error occurred",
      });
    }
  });

  if (confirmationEmail) {
    return (
      <Card className={cn("w-full max-w-sm")}>
        <CardHeader>
          <CardTitle className={cn("text-2xl")}>Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to {confirmationEmail}. Confirm your
            email to finish signing up.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-sm")}>
      <CardHeader>
        <CardTitle className={cn("text-2xl")}>Sign up</CardTitle>
        <CardDescription>Create a new account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          noValidate
          onSubmit={(event) => {
            void handleSignUp(event);
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
                  form.formState.errors.email ? "signup-email-error" : undefined
                }
                {...form.register("email")}
              />
              <FieldError id="signup-email-error">
                {form.formState.errors.email?.message}
              </FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                aria-invalid={Boolean(form.formState.errors.password)}
                aria-describedby={
                  form.formState.errors.password
                    ? "signup-password-error"
                    : undefined
                }
                {...form.register("password")}
              />
              <FieldError id="signup-password-error">
                {form.formState.errors.password?.message}
              </FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="repeat-password">Repeat password</FieldLabel>
              <PasswordInput
                id="repeat-password"
                visibilityLabel="repeat password"
                autoComplete="new-password"
                aria-invalid={Boolean(form.formState.errors.repeatPassword)}
                aria-describedby={
                  form.formState.errors.repeatPassword
                    ? "signup-repeat-password-error"
                    : undefined
                }
                {...form.register("repeatPassword")}
              />
              <FieldError id="signup-repeat-password-error">
                {form.formState.errors.repeatPassword?.message}
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
              {form.formState.isSubmitting
                ? "Creating an account..."
                : "Sign up"}
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
