import assert from "node:assert/strict";
import test from "node:test";

import {
  consultationPatchSchema,
  consultationPostSchema,
  consultationRowsSchema,
} from "../../lib/validation/consultation.ts";

const row = {
  id: "a1000000-0000-4000-8000-0000000000a1",
  student_id: "a0000000-0000-4000-8000-00000000000a",
  first_name: "Ann",
  last_name: "Able",
  reason: "Consultation",
  scheduled_at: "2099-01-01T10:00:00+00:00",
  status: "scheduled",
  created_at: "2026-01-01T10:00:00+00:00",
  updated_at: "2026-01-01T10:00:00+00:00",
};

test("validates and maps consultation rows to the API response shape", () => {
  assert.deepEqual(consultationRowsSchema.parse([row]), [
    {
      id: row.id,
      studentId: row.student_id,
      firstName: row.first_name,
      lastName: row.last_name,
      reason: row.reason,
      scheduledAt: row.scheduled_at,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  ]);
});

test("accepts an empty list and each consultation status", () => {
  assert.deepEqual(consultationRowsSchema.parse([]), []);
  for (const status of ["scheduled", "completed", "cancelled"]) {
    assert.equal(
      consultationRowsSchema.safeParse([{ ...row, status }]).success,
      true,
    );
  }
});

test("rejects malformed consultation data", () => {
  for (const invalidRow of [
    { ...row, id: "not-a-uuid" },
    { ...row, first_name: null },
    { ...row, reason: "" },
    { ...row, scheduled_at: null },
    { ...row, status: "unknown" },
  ]) {
    assert.equal(consultationRowsSchema.safeParse([invalidRow]).success, false);
  }
  assert.equal(consultationRowsSchema.safeParse(null).success, false);
});

test("only accepts completed as the status update value", () => {
  const updatedAt = "2026-01-01T10:00:00+00:00";

  assert.equal(
    consultationPatchSchema.safeParse({
      action: "setStatus",
      status: "completed",
      updatedAt,
    }).success,
    true,
  );
  assert.equal(
    consultationPatchSchema.safeParse({
      action: "setStatus",
      status: "scheduled",
      updatedAt,
    }).success,
    false,
  );
  assert.equal(
    consultationPatchSchema.safeParse({
      action: "setStatus",
      status: "cancelled",
      updatedAt,
    }).success,
    false,
  );
});

test("validates and normalizes consultation booking input", () => {
  const result = consultationPostSchema.parse({
    firstName: " Ann ",
    lastName: " Able ",
    reason: " Consultation ",
    scheduledAt: "2099-01-01T10:00:00+00:00",
    ignored: "stripped",
  });

  assert.deepEqual(result, {
    firstName: "Ann",
    lastName: "Able",
    reason: "Consultation",
    scheduledAt: "2099-01-01T10:00:00+00:00",
  });
});

test("rejects invalid names, reasons, timestamps without offsets, and past times", () => {
  const validInput = {
    firstName: "Ann",
    lastName: "Able",
    reason: "Consultation",
    scheduledAt: "2099-01-01T10:00:00+00:00",
  };
  const invalidInputs = [
    { ...validInput, firstName: " " },
    { ...validInput, firstName: "a".repeat(101) },
    { ...validInput, lastName: "" },
    { ...validInput, reason: " " },
    { ...validInput, reason: "a".repeat(1001) },
    { ...validInput, scheduledAt: "2099-01-01T10:00:00" },
    { ...validInput, scheduledAt: "2000-01-01T10:00:00Z" },
  ];

  for (const invalidInput of invalidInputs) {
    assert.equal(consultationPostSchema.safeParse(invalidInput).success, false);
  }
});
