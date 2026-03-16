import type { APIRoute } from "astro";
import { createAuth } from "../../../lib/auth";

export const ALL: APIRoute = async (context) => {
  const d1 = (context.locals as Record<string, { env: { DB: any } }>).runtime.env.DB;
  const auth = createAuth(d1);
  return auth.handler(context.request);
};
