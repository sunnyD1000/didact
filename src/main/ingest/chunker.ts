const CHUNK_SIZE = 512; // target tokens (~4 chars/token)
const OVERLAP = 64; // overlap tokens

export interface TextChunk {
  chunkIndex: number;
  text: string;
}

/**
 * Split text into overlapping chunks of approximately CHUNK_SIZE tokens.
 * Uses character-based approximation (1 token ≈ 4 chars).
 */
export function chunkText(text: string): TextChunk[] {
  const charSize = CHUNK_SIZE * 4;
  const charOverlap = OVERLAP * 4;
  const chunks: TextChunk[] = [];

  // Prefer splitting on paragraph boundaries
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  let current = "";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > charSize && current.length > 0) {
      chunks.push({ chunkIndex: chunkIndex++, text: current.trim() });
      // Keep tail overlap
      const words = current.split(/\s+/);
      const overlapWords = words.slice(
        Math.max(0, words.length - Math.floor(charOverlap / 5))
      );
      current = overlapWords.join(" ") + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }

  if (current.trim()) {
    chunks.push({ chunkIndex: chunkIndex++, text: current.trim() });
  }

  return chunks;
}
