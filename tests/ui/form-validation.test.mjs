import assert from "node:assert/strict";
import test from "node:test";

import {
  consultationFormSchema,
  consultationRescheduleFormSchema,
  forgotPasswordFormSchema,
  loginFormSchema,
  resetPasswordFormSchema,
  signUpFormSchema,
} from "../../lib/validation/forms.ts";

test("validates authentication form inputs", () => {
  assert.equal(
    loginFormSchema.safeParse({
      email: "student@example.com",
      password: "password",
    }).success,
    true,
  );
  assert.equal(
    forgotPasswordFormSchema.safeParse({ email: "invalid" }).success,
    false,
  );
  assert.equal(
    resetPasswordFormSchema.safeParse({ password: "" }).success,
    false,
  );
});

test("requires matching sign-up passwords", () => {
  const credentials = {
    email: "student@example.com",
    password: "password",
    repeatPassword: "password",
  };

  assert.equal(signUpFormSchema.safeParse(credentials).success, true);
  assert.equal(
    signUpFormSchema.safeParse({
      ...credentials,
      repeatPassword: "different",
    }).success,
    false,
  );
});

test("validates consultation form fields and limits", () => {
  assert.equal(
    consultationFormSchema.safeParse({
      firstName: " Ann ",
      lastName: " Able ",
      reason: " Consultation ",
      scheduledAt: "2099-01-01T10:00",
    }).success,
    true,
  );
  assert.equal(
    consultationFormSchema.safeParse({
      firstName: " ",
      lastName: "Able",
      reason: "Consultation",
      scheduledAt: "",
    }).success,
    false,
  );
  assert.equal(
    consultationRescheduleFormSchema.safeParse({ scheduledAt: "" }).success,
    false,
  );
});
