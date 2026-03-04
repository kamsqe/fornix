/**
 * Auth API catch-all route.
 *
 * Better Auth handles all auth endpoints (login, signup, callback, etc.)
 * through this single catch-all route at /api/auth/[...all].
 */

import type { APIRoute } from "astro";
import { createAuth } from "../../../lib/auth";

export const ALL: APIRoute = async (context) => {
  const d1 = (context.locals as Record<string, { env: { DB: D1Database } }>).runtime.env.DB;
  const auth = createAuth(d1);
  return auth.handler(context.request);
};
