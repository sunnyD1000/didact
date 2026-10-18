import { randomUUID } from "crypto";
import { getDb } from "../db/index";
import { llmClient } from "../llm/client";
import { getChunksForFile, searchChunks } from "../ingest/lancedb";
import { embedChunks } from "../ingest/embedder";
import type { McAnswer } from "../db/types";

interface McQuestion {
  prompt: string;
  options: string[];
  correct: number;
  source_chunk_id?: string;
}

export async function generateMaterialMC(
  folderId: string,
  fileId: string,
  count = 5
): Promise<void> {
  const db = getDb();
  const chunks = await getChunksForFile(fileId);
  if (chunks.length === 0) throw new Error("File has no embedded chunks. Please ingest the file first.");

  const contextText = chunks.map((c) => `[Chunk ${c.id}]\n${c.text}`).join("\n\n---\n\n");

  const prompt = `You are an expert educator. Using ONLY the following source material, generate exactly ${count} multiple-choice conceptual questions.

Rules:
- Each question must test a single concept from the material.
- Provide 4 answer options (A–D). Exactly one must be correct.
- Include the Chunk ID of the text that supports the correct answer as "source_chunk_id".
- Return ONLY a JSON object: { "questions": [ { "prompt": "...", "options": ["A...", "B...", "C...", "D..."], "correct": 0, "source_chunk_id": "..." } ] }

Source Material:
${contextText}`;

  const raw = await llmClient.complete(prompt, { jsonMode: true, temperature: 0.4 });
  let parsed: { questions: McQuestion[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM returned invalid JSON for MC questions.");
  }

  const insertQ = db.prepare(
    "INSERT INTO questions (id, folder_id, file_id, type, prompt, answer_json, source_ref) VALUES (?, ?, ?, 'mc_conceptual', ?, ?, ?)"
  );

  const insertAll = db.transaction(() => {
    for (const q of parsed.questions) {
      const answer: McAnswer = {
        options: q.options,
        correct: q.correct,
        source_chunk_id: q.source_chunk_id,
      };
      insertQ.run(
        randomUUID(),
        folderId,
        fileId,
        q.prompt,
        JSON.stringify(answer),
        q.source_chunk_id ?? null
      );
    }
  });
  insertAll();
}
