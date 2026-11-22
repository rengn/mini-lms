import HttpStatusCodes from "http-status-codes";
import type { z } from "zod";

export function withValidatedBody<TBody, TContext extends { request: Request }>(
  schema: z.ZodType<TBody>,
  handler: (context: TContext, body: TBody) => Promise<Response>,
) {
  return async (context: TContext): Promise<Response> => {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch (error: unknown) {
      if (error instanceof SyntaxError) {
        return Response.json(
          {
            error: {
              code: "INVALID_JSON",
              message: "Request body must be valid JSON.",
            },
          },
          { status: HttpStatusCodes.BAD_REQUEST },
        );
      }
      throw error;
    }

    const parsed = await schema.safeParseAsync(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Request body is invalid.",
            details: parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
        { status: HttpStatusCodes.BAD_REQUEST },
      );
    }

    return handler(context, parsed.data);
  };
}
