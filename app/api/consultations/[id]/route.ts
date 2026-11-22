import HttpStatusCodes from "http-status-codes";

import { type AuthenticatedContext, withAuth } from "@/lib/api/with-auth";
import { withHttpErrorHandling } from "@/lib/api/with-http-error-handling";
import { withSameOrigin } from "@/lib/api/with-same-origin";
import { withValidatedBody } from "@/lib/api/with-validated-body";
import { updateConsultation } from "@/lib/dal/consultations";
import {
  consultationIdSchema,
  consultationPatchSchema,
} from "@/lib/validation/consultation";

interface ConsultationRouteContext {
  params: Promise<{ id: string }>;
}

function apiError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export const PATCH = withHttpErrorHandling(
  withAuth<ConsultationRouteContext>(
    withSameOrigin(
      withValidatedBody(
        consultationPatchSchema,
        async (
          {
            supabase,
            userId,
            routeContext,
          }: AuthenticatedContext<ConsultationRouteContext>,
          input,
        ) => {
          const { id } = await routeContext.params;
          const parsedId = consultationIdSchema.safeParse(id);

          if (!parsedId.success) {
            return apiError(
              "INVALID_ID",
              "Consultation ID is invalid.",
              HttpStatusCodes.BAD_REQUEST,
            );
          }

          const result = await updateConsultation(
            { supabase, userId },
            parsedId.data,
            input,
          );

          if (!result.ok) {
            switch (result.reason) {
              case "not_found":
                return apiError(
                  "NOT_FOUND",
                  "Consultation not found.",
                  HttpStatusCodes.NOT_FOUND,
                );
              case "conflict":
                return apiError(
                  "CONSULTATION_CONFLICT",
                  "The consultation has changed. Refresh and try again.",
                  HttpStatusCodes.CONFLICT,
                );
              case "time_conflict":
                return apiError(
                  "CONSULTATION_CONFLICT",
                  "A consultation is already scheduled for that time.",
                  HttpStatusCodes.CONFLICT,
                );
              case "forbidden":
                return apiError(
                  "FORBIDDEN",
                  "You are not allowed to update this consultation.",
                  HttpStatusCodes.FORBIDDEN,
                );
              case "invalid":
                return apiError(
                  "INVALID_CONSULTATION",
                  "The consultation cannot be changed in this way.",
                  HttpStatusCodes.UNPROCESSABLE_ENTITY,
                );
              default:
                return result satisfies never;
            }
          }

          return Response.json(
            { consultation: result.consultation },
            { status: HttpStatusCodes.OK },
          );
        },
      ),
    ),
  ),
);
