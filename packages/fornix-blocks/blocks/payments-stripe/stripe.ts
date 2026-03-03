import Stripe from "stripe";

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not defined");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});
