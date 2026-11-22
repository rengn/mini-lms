import HttpStatusCodes from "http-status-codes";

import { type AuthenticatedContext, withAuth } from "@/lib/api/with-auth";
import { withHttpErrorHandling } from "@/lib/api/with-http-error-handling";
import { withSameOrigin } from "@/lib/api/with-same-origin";
import { withValidatedBody } from "@/lib/api/with-validated-body";
import { createConsultation, listConsultations } from "@/lib/dal/consultations";
import { consultationPostSchema } from "@/lib/validation/consultation";

function apiError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export const GET = withHttpErrorHandling(
  withAuth(async (user) => {
    const consultations = await listConsultations(user);
    return Response.json({ consultations }, { status: HttpStatusCodes.OK });
  }),
);

export const POST = withHttpErrorHandling(
  withAuth(
    withSameOrigin(
      withValidatedBody(
        consultationPostSchema,
        async (user: AuthenticatedContext<unknown>, body) => {
          const result = await createConsultation(user, body);

          if (!result.ok) {
            switch (result.reason) {
              case "conflict":
                return apiError(
                  "CONSULTATION_CONFLICT",
                  "A consultation is already scheduled for that time.",
                  HttpStatusCodes.CONFLICT,
                );
              case "forbidden":
                return apiError(
                  "FORBIDDEN",
                  "You are not allowed to book consultations.",
                  HttpStatusCodes.FORBIDDEN,
                );
              case "invalid":
                return apiError(
                  "INVALID_CONSULTATION",
                  "Consultation details violate booking rules.",
                  HttpStatusCodes.UNPROCESSABLE_ENTITY,
                );
              default:
                return result satisfies never;
            }
          }

          return Response.json(
            { consultation: result.consultation },
            { status: HttpStatusCodes.CREATED },
          );
        },
      ),
    ),
  ),
);
