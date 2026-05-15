import { z } from "zod";

/**
 * AIProvider — abstraction over LLM backends.
 *
 * `generate` returns structured data parsed by a Zod schema.
 * `stream` returns an async iterable of text chunks.
 */
export interface AIProvider {
  readonly name: string;

  generate<T extends z.ZodType>(options: {
    system: string;
    prompt: string;
    schema: T;
    maxTokens?: number;
  }): Promise<z.infer<T>>;

  stream(options: {
    system: string;
    prompt: string;
  }): AsyncIterable<string>;
}
