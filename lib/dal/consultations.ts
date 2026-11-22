import "server-only";

import type { AuthenticatedUser } from "@/lib/dal/auth";
import {
  consultationRowSchema,
  consultationRowsSchema,
  type CreateConsultationInput,
  type UpdateConsultationInput,
} from "@/lib/validation/consultation";

export async function listConsultations({ supabase }: AuthenticatedUser) {
  const { data, error } = await supabase
    .from("consultations")
    .select(
      "id, student_id, first_name, last_name, reason, scheduled_at, status, created_at, updated_at",
    )
    .order("scheduled_at")
    .order("id");

  if (error) {
    throw new Error("Could not load consultations.", { cause: error });
  }

  return consultationRowsSchema.parse(data);
}

export async function createConsultation(
  { supabase }: AuthenticatedUser,
  input: CreateConsultationInput,
) {
  const { data, error } = await supabase
    .from("consultations")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      reason: input.reason,
      scheduled_at: input.scheduledAt,
    })
    .select(
      "id, student_id, first_name, last_name, reason, scheduled_at, status, created_at, updated_at",
    )
    .single();

  if (error) {
    switch (error.code) {
      case "23505":
        return { ok: false, reason: "conflict" } as const;
      case "23514":
        return { ok: false, reason: "invalid" } as const;
      case "42501":
        return { ok: false, reason: "forbidden" } as const;
      default:
        throw new Error("Could not create consultation.", { cause: error });
    }
  }

  return {
    ok: true,
    consultation: consultationRowSchema.parse(data),
  } as const;
}

export async function updateConsultation(
  { supabase }: AuthenticatedUser,
  id: string,
  input: UpdateConsultationInput,
) {
  const { data: current, error: lookupError } = await supabase
    .from("consultations")
    .select("id, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    throw new Error("Could not find consultation to update.", {
      cause: lookupError,
    });
  }

  if (!current) {
    return { ok: false, reason: "not_found" } as const;
  }

  if (current.updated_at !== input.updatedAt) {
    return { ok: false, reason: "conflict" } as const;
  }

  const changes =
    input.action === "reschedule"
      ? { scheduled_at: input.scheduledAt }
      : input.action === "cancel"
        ? { status: "cancelled" as const }
        : { status: input.status };

  const { data, error } = await supabase
    .from("consultations")
    .update(changes)
    .eq("id", id)
    .eq("updated_at", input.updatedAt)
    .select(
      "id, student_id, first_name, last_name, reason, scheduled_at, status, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    switch (error.code) {
      case "23505":
        return { ok: false, reason: "time_conflict" } as const;
      case "23514":
        return { ok: false, reason: "invalid" } as const;
      case "42501":
        return { ok: false, reason: "forbidden" } as const;
      default:
        throw new Error("Could not update consultation.", { cause: error });
    }
  }

  if (!data) {
    const { data: latest, error: latestError } = await supabase
      .from("consultations")
      .select("id, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (latestError) {
      throw new Error("Could not verify consultation update.", {
        cause: latestError,
      });
    }

    if (!latest) {
      return { ok: false, reason: "not_found" } as const;
    }

    if (latest.updated_at !== input.updatedAt) {
      return { ok: false, reason: "conflict" } as const;
    }

    return { ok: false, reason: "forbidden" } as const;
  }

  return {
    ok: true,
    consultation: consultationRowSchema.parse(data),
  } as const;
}
