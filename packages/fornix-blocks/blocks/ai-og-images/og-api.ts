import type { APIRoute } from "astro";
import { generateOgImage } from "../../lib/og-generator";

export const GET: APIRoute = async ({ url }) => {
  try {
    const title = url.searchParams.get("title") ?? "Untitled";
    const subtitle = url.searchParams.get("subtitle") ?? undefined;

    const imageBytes = await generateOgImage({ title, subtitle });

    return new Response(imageBytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
