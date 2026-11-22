"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
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
import { loginFormSchema } from "@/lib/validation/forms";

export function LoginForm() {
  const form = useForm<z.input<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleLogin = form.handleSubmit(async ({ email, password }) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Complete navigation drops router cache entries prefetched when unauthenticated
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
        <CardTitle className={cn("text-2xl")}>Login</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          noValidate
          onSubmit={(event) => {
            void handleLogin(event);
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
                  form.formState.errors.email ? "email-error" : undefined
                }
                {...form.register("email")}
              />
              <FieldError id="email-error">
                {form.formState.errors.email?.message}
              </FieldError>
            </Field>
            <Field className={cn("grid grid-cols-[auto_minmax(0,1fr)]")}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Link
                href="/auth/forgot-password"
                className={cn(
                  "justify-self-end text-right text-sm underline-offset-4 hover:underline",
                )}
              >
                Forgot your password?
              </Link>
              <PasswordInput
                id="password"
                containerClassName="col-span-2"
                autoComplete="current-password"
                aria-invalid={Boolean(form.formState.errors.password)}
                aria-describedby={
                  form.formState.errors.password ? "password-error" : undefined
                }
                {...form.register("password")}
              />
              <FieldError id="password-error" className={cn("col-span-2")}>
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
              {form.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </FieldGroup>
          <p className={cn("mt-4 text-center text-sm")}>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/sign-up"
              className={cn("underline underline-offset-4")}
            >
              Sign up
            </Link>
          </p>
        </Form>
      </CardContent>
    </Card>
  );
}
