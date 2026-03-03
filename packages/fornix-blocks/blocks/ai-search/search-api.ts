import type { APIRoute } from "astro";
import { searchVectorize } from "../../lib/ai-search";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { query?: string; topK?: number };
    const query = body.query ?? "";

    if (!query.trim()) {
      return new Response(
        JSON.stringify({ error: "No query provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const results = await searchVectorize(query, { topK: body.topK });

    return new Response(
      JSON.stringify({ results }),
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
