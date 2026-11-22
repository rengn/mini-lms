import HttpStatusCodes from "http-status-codes";

type ApiHandler<TRouteContext> = (
  request: Request,
  routeContext: TRouteContext,
) => Promise<Response>;

export function withHttpErrorHandling<TRouteContext = unknown>(
  handler: ApiHandler<TRouteContext>,
) {
  return async (
    request: Request,
    routeContext: TRouteContext,
  ): Promise<Response> => {
    try {
      return await handler(request, routeContext);
    } catch (error: unknown) {
      console.error("Unhandled API error", {
        method: request.method,
        pathname: new URL(request.url).pathname,
        error,
      });

      return Response.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred.",
          },
        },
        { status: HttpStatusCodes.INTERNAL_SERVER_ERROR },
      );
    }
  };
}
