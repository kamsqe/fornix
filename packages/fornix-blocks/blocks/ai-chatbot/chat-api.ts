import type { APIRoute } from "astro";
import { chatCompletion } from "../../lib/ai-chat";
import type { ChatMessage } from "../../lib/ai-chat";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = body.messages ?? [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const response = await chatCompletion(messages);

    return new Response(
      JSON.stringify({ response }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
