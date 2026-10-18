import { randomUUID } from "crypto";
import { getDb } from "../db/index";
import { llmClient } from "../llm/client";
import { getChunksForFile } from "../ingest/lancedb";
import type { FeynmanAnswer } from "../db/types";

interface FeynmanRaw {
  question: string;
  model_answer: string;
  propositions: string[];
  source_chunk_id?: string;
}

export async function generateFeynmanQuestions(
  folderId: string,
  fileId: string,
  count = 5
): Promise<void> {
  const db = getDb();
  const chunks = await getChunksForFile(fileId);
  if (chunks.length === 0) throw new Error("File has no embedded chunks. Please ingest first.");

  const contextText = chunks.map((c) => `[Chunk ${c.id}]\n${c.text}`).join("\n\n---\n\n");

  const prompt = `You are an expert educator specializing in the Feynman Technique. Using ONLY the following source material, generate exactly ${count} open-ended Feynman questions.

For each question:
1. Write a question that requires the student to explain a concept in their own words.
2. Write a short, concise model answer (2–4 sentences).
3. List 3–6 essential propositions/claims that a correct answer MUST contain.
4. Include the Chunk ID supporting the question.

Return ONLY a JSON object:
{
  "questions": [
    {
      "question": "...",
      "model_answer": "...",
      "propositions": ["...", "..."],
      "source_chunk_id": "..."
    }
  ]
}

Source Material:
${contextText}`;

  const raw = await llmClient.complete(prompt, { jsonMode: true, temperature: 0.4 });
  let parsed: { questions: FeynmanRaw[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM returned invalid JSON for Feynman questions.");
  }

  const insertQ = db.prepare(
    "INSERT INTO questions (id, folder_id, file_id, type, prompt, answer_json, source_ref) VALUES (?, ?, ?, 'feynman', ?, ?, ?)"
  );
  const insertProp = db.prepare(
    "INSERT INTO essential_propositions (id, question_id, proposition) VALUES (?, ?, ?)"
  );

  const insertAll = db.transaction(() => {
    for (const q of parsed.questions) {
      const qId = randomUUID();
      const answer: FeynmanAnswer = {
        model_answer: q.model_answer,
        source_chunk_id: q.source_chunk_id,
      };
      insertQ.run(qId, folderId, fileId, q.question, JSON.stringify(answer), q.source_chunk_id ?? null);
      for (const prop of q.propositions) {
        insertProp.run(randomUUID(), qId, prop);
      }
    }
  });
  insertAll();
}
