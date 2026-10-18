import { randomUUID } from "crypto";
import { getDb } from "../db/index";
import { llmClient } from "../llm/client";
import { getChunksForFile, searchChunks } from "../ingest/lancedb";
import { embedChunks } from "../ingest/embedder";
import type { ExamVerbatimAnswer, TimeLimitBucket } from "../db/types";

interface ExtractedQuestion {
  prompt: string;
  answer: string;
  type: "numeric" | "mc";
  options?: string[];
  time_limit_bucket: TimeLimitBucket;
  time_limit_reasoning: string;
  source_hint?: string;
}

export async function extractExamQuestions(
  folderId: string,
  fileId: string
): Promise<void> {
  const db = getDb();
  const chunks = await getChunksForFile(fileId);
  if (chunks.length === 0) throw new Error("File not ingested yet.");

  const contextText = chunks.map((c) => c.text).join("\n\n---\n\n");

  const prompt = `You are an expert at extracting exam questions. Extract ALL questions and answers VERBATIM from the following examination file.

For each question:
- "prompt": the exact question text
- "answer": the exact correct answer
- "type": "numeric" if the answer is a number, "mc" if it is multiple choice
- "options": if type is "mc", list all answer choices
- "time_limit_bucket": classify as "lt5" (single-step recall — you either know it or not), "lt15" (quick to moderate solve using the right method), or "gt15" (multi-stage exam problem)
- "time_limit_reasoning": 1–2 sentence justification for the bucket
- "source_hint": a brief phrase describing which concept this tests

Return ONLY a JSON object: { "questions": [ ... ] }

Examination content:
${contextText}`;

  const raw = await llmClient.complete(prompt, { jsonMode: true, temperature: 0.1 });
  let parsed: { questions: ExtractedQuestion[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM returned invalid JSON for exam extraction.");
  }

  // Get folder's material file IDs for source matching
  const materialFiles = db
    .prepare("SELECT id FROM content_files WHERE folder_id = ? AND type = 'material'")
    .all(folderId) as { id: string }[];
  const materialFileIds = materialFiles.map((f) => f.id);

  const insertQ = db.prepare(
    "INSERT INTO questions (id, folder_id, file_id, type, prompt, answer_json, source_ref, time_limit_bucket) VALUES (?, ?, ?, 'exam_verbatim', ?, ?, ?, ?)"
  );
  const insertSr = db.prepare(
    "INSERT OR IGNORE INTO sr_state (question_id, ease_factor, interval_days, due_date, repetitions) VALUES (?, 2.5, 1, date('now'), 0)"
  );

  const insertAll = db.transaction(async () => {
    for (const q of parsed.questions) {
      const qId = randomUUID();
      const answer: ExamVerbatimAnswer = {
        answer: q.answer,
        answer_type: q.type,
        options: q.options,
        time_limit_bucket: q.time_limit_bucket,
        time_limit_reasoning: q.time_limit_reasoning,
      };

      let sourceRef: string | null = null;
      // Try to find source chunk via semantic search in materials
      if (materialFileIds.length > 0 && q.source_hint) {
        try {
          const [embedded] = await embedChunks([{ chunkIndex: 0, text: q.source_hint }]);
          const results = await searchChunks(embedded.vector, folderId, materialFileIds, 1);
          if (results.length > 0) sourceRef = results[0].id;
        } catch {
          // non-fatal — source ref remains null
        }
      }

      insertQ.run(qId, folderId, fileId, q.prompt, JSON.stringify(answer), sourceRef, q.time_limit_bucket);
      insertSr.run(qId);
    }
  });
  // Note: transaction can't be async — run async parts before transaction
  const withSources: Array<{
    q: ExtractedQuestion;
    sourceRef: string | null;
    qId: string;
  }> = [];

  for (const q of parsed.questions) {
    let sourceRef: string | null = null;
    if (materialFileIds.length > 0 && q.source_hint) {
      try {
        const [embedded] = await embedChunks([{ chunkIndex: 0, text: q.source_hint }]);
        const results = await searchChunks(embedded.vector, folderId, materialFileIds, 1);
        if (results.length > 0) sourceRef = results[0].id;
      } catch {
        // non-fatal
      }
    }
    withSources.push({ q, sourceRef, qId: randomUUID() });
  }

  db.transaction(() => {
    for (const { q, sourceRef, qId } of withSources) {
      const answer: ExamVerbatimAnswer = {
        answer: q.answer,
        answer_type: q.type,
        options: q.options,
        time_limit_bucket: q.time_limit_bucket,
        time_limit_reasoning: q.time_limit_reasoning,
      };
      insertQ.run(qId, folderId, fileId, q.prompt, JSON.stringify(answer), sourceRef, q.time_limit_bucket);
      insertSr.run(qId);
    }
  })();
}
