/**
 * Better Auth configuration.
 *
 * This file sets up the auth instance with the D1 database adapter
 * and configures available providers (email/password + GitHub OAuth).
 */

import { betterAuth } from "better-auth";
import { getDb } from "./db";

export function createAuth(d1: D1Database) {
  const db = getDb(d1);

  return betterAuth({
    database: db,
    secret: import.meta.env.AUTH_SECRET,

    emailAndPassword: {
      enabled: true,
    },

    socialProviders: {
      github: {
        clientId: import.meta.env.GITHUB_CLIENT_ID,
        clientSecret: import.meta.env.GITHUB_CLIENT_SECRET,
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
  });
}
