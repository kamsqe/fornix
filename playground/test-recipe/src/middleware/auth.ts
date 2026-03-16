import type { MiddlewareHandler } from "astro";
import { createAuth } from "../lib/auth";

export const authMiddleware: MiddlewareHandler = async (context, next) => {
  return next();
};
