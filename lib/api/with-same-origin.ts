import HttpStatusCodes from "http-status-codes";

export function withSameOrigin<TContext extends { request: Request }>(
  handler: (context: TContext) => Promise<Response>,
) {
  return async (context: TContext): Promise<Response> => {
    const origin = context.request.headers.get("origin");
    const requestOrigin = new URL(context.request.url).origin;

    if (!origin || origin !== requestOrigin) {
      return Response.json(
        {
          error: {
            code: "ORIGIN_NOT_ALLOWED",
            message: "Request origin is not allowed.",
          },
        },
        { status: HttpStatusCodes.FORBIDDEN },
      );
    }

    return handler(context);
  };
}
