import { llmClient } from "../llm/client";
import type { TextChunk } from "./chunker";

export interface EmbeddedChunk extends TextChunk {
  vector: number[];
}

/**
 * Embed a batch of text chunks using the configured LLM provider.
 */
export async function embedChunks(chunks: TextChunk[]): Promise<EmbeddedChunk[]> {
  const texts = chunks.map((c) => c.text);
  const vectors = await llmClient.embed(texts);
  return chunks.map((chunk, i) => ({ ...chunk, vector: vectors[i] }));
}
