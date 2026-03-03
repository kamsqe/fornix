/**
 * AI Search — Cloudflare Workers AI + Vectorize integration.
 *
 * Provides embedding generation and vector similarity search
 * for semantic content retrieval.
 */

export interface SearchResult {
  readonly id: string;
  readonly score: number;
  readonly metadata: Record<string, unknown>;
}

export interface SearchOptions {
  readonly topK?: number;
  readonly model?: string;
}

const DEFAULT_EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";

/**
 * Generate an embedding vector for the given text using Workers AI.
 */
export async function generateEmbedding(
  text: string,
  model?: string,
): Promise<ReadonlyArray<number>> {
  const accountId = getEnvOrThrow("CLOUDFLARE_ACCOUNT_ID");
  const token = getEnvOrThrow("CLOUDFLARE_AI_TOKEN");
  const embeddingModel = model ?? DEFAULT_EMBEDDING_MODEL;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${embeddingModel}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: [text] }),
    },
  );

  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { result: { data: number[][] } };
  const vectors = data.result.data;
  if (!vectors || vectors.length === 0) {
    throw new Error("No embedding returned from Workers AI");
  }
  return vectors[0]!;
}

/**
 * Query a Vectorize index with semantic similarity search.
 */
export async function searchVectorize(
  query: string,
  options: SearchOptions = {},
): Promise<ReadonlyArray<SearchResult>> {
  const accountId = getEnvOrThrow("CLOUDFLARE_ACCOUNT_ID");
  const token = getEnvOrThrow("CLOUDFLARE_AI_TOKEN");
  const indexName = getEnvOrThrow("VECTORIZE_INDEX_NAME");
  const topK = options.topK ?? 5;

  // Step 1: Generate query embedding
  const embedding = await generateEmbedding(query, options.model);

  // Step 2: Query Vectorize
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${indexName}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector: embedding,
        topK,
        returnMetadata: "all",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Vectorize query failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    result: { matches: Array<{ id: string; score: number; metadata: Record<string, unknown> }> };
  };

  return data.result.matches.map((match) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata,
  }));
}

function getEnvOrThrow(name: string): string {
  const value = typeof process !== "undefined"
    ? process.env[name]
    : undefined;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
