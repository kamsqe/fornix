/**
 * Auth middleware — protects routes and makes session available.
 *
 * Add this to your Astro middleware chain. It reads the session cookie
 * and populates `Astro.locals.user` and `Astro.locals.session`.
 *
 * To protect a route, check `if (!Astro.locals.user)` in your page.
 */

import type { MiddlewareHandler } from "astro";
import { createAuth } from "../lib/auth";

export const authMiddleware: MiddlewareHandler = async (context, next) => {
  const d1 = (context.locals as Record<string, unknown>).runtime
    ? ((context.locals as Record<string, { env: { DB: D1Database } }>).runtime.env.DB)
    : undefined;

  if (!d1) {
    return next();
  }

  const auth = createAuth(d1);

  const sessionCookie = context.request.headers.get("cookie") ?? "";
  const session = await auth.api.getSession({
    headers: new Headers({ cookie: sessionCookie }),
  });

  if (session) {
    (context.locals as Record<string, unknown>).user = session.user;
    (context.locals as Record<string, unknown>).session = session.session;
  }

  return next();
};
