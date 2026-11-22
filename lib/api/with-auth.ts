import HttpStatusCodes from "http-status-codes";

import { type AuthenticatedUser, getAuthenticatedUser } from "@/lib/dal/auth";

export interface AuthenticatedContext<TRouteContext> extends AuthenticatedUser {
  request: Request;
  routeContext: TRouteContext;
}

type AuthenticatedHandler<TRouteContext> = (
  context: AuthenticatedContext<TRouteContext>,
) => Promise<Response>;

export function withAuth<TRouteContext = unknown>(
  handler: AuthenticatedHandler<TRouteContext>,
) {
  return async (
    request: Request,
    routeContext: TRouteContext,
  ): Promise<Response> => {
    const user = await getAuthenticatedUser();

    if (!user) {
      return Response.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } },
        { status: HttpStatusCodes.UNAUTHORIZED },
      );
    }

    return handler({ request, routeContext, ...user });
  };
}
