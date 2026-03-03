import { Resend } from "resend";

const resendApiKey = import.meta.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("RESEND_API_KEY environment variable is not defined");
}

export const resend = new Resend(resendApiKey);
