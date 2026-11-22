import { z } from "zod";

import {
  type Consultation,
  consultationSchema,
  type CreateConsultationInput,
  type UpdateConsultationInput,
} from "@/lib/validation/consultation";

const apiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
  }),
});

const consultationResponseSchema = z.object({
  consultation: consultationSchema,
});

const consultationsResponseSchema = z.object({
  consultations: z.array(consultationSchema),
});

async function readResponse(response: Response): Promise<unknown> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error: unknown) {
    throw new Error("The server returned an invalid response.", {
      cause: error,
    });
  }

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(payload);
    throw new Error(
      parsedError.success
        ? parsedError.data.error.message
        : `The request failed (HTTP ${response.status}). Please try again.`,
    );
  }

  return payload;
}

async function readConsultationResponse(
  response: Response,
): Promise<Consultation> {
  const payload = await readResponse(response);
  const parsedResponse = consultationResponseSchema.safeParse(payload);
  if (!parsedResponse.success) {
    throw new Error("The server returned an invalid response.");
  }

  return parsedResponse.data.consultation;
}

async function sendConsultationRequest(
  url: string,
  method: "POST" | "PATCH",
  input: CreateConsultationInput | UpdateConsultationInput,
) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return readConsultationResponse(response);
}

export async function getConsultations(): Promise<Consultation[]> {
  const response = await fetch("/api/consultations", {
    method: "GET",
    cache: "no-store",
  });
  const payload = await readResponse(response);
  const parsedResponse = consultationsResponseSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new Error("The server returned an invalid response.");
  }

  return parsedResponse.data.consultations;
}

export function postConsultation(input: CreateConsultationInput) {
  return sendConsultationRequest("/api/consultations", "POST", input);
}

export function patchConsultation(id: string, input: UpdateConsultationInput) {
  return sendConsultationRequest(
    `/api/consultations/${encodeURIComponent(id)}`,
    "PATCH",
    input,
  );
}
