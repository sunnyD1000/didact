import { randomUUID } from "crypto";
import { getDb } from "../db/index";
import { llmClient } from "../llm/client";
import { searchChunks } from "../ingest/lancedb";
import { embedChunks } from "../ingest/embedder";
import { jevScore } from "../jev/client";
import { getSettings } from "../settings";
import type { ExamModifiedAnswer, TimeLimitBucket, Question } from "../db/types";

export async function generateModifiedQuestions(folderId: string): Promise<number> {
  const db = getDb();
  const settings = getSettings();

  // Fetch all verbatim exam questions for the folder (not bad)
  const verbatim = db
    .prepare(
      "SELECT * FROM questions WHERE folder_id = ? AND type = 'exam_verbatim' AND is_bad = 0"
    )
    .all(folderId) as Question[];

  if (verbatim.length < 2) return 0;

  // Get material file IDs for source lookup
  const materialFiles = db
    .prepare("SELECT id FROM content_files WHERE folder_id = ? AND type = 'material'")
    .all(folderId) as { id: string }[];
  const materialFileIds = materialFiles.map((f) => f.id);

  // Build candidate pairs
  const pairs: Array<[Question, Question]> = [];
  for (let i = 0; i < verbatim.length; i++) {
    for (let j = i + 1; j < verbatim.length; j++) {
      pairs.push([verbatim[i], verbatim[j]]);
    }
  }

  let generated = 0;

  for (const [qa, qb] of pairs) {
    // Pass 1 — merge-fit: are these questions semantically related?
    let relatedness: number;
    try {
      relatedness = await jevScore(qa.prompt, qb.prompt);
    } catch {
      continue; // Jev unavailable — skip
    }
    if (relatedness < settings.mergeRelatenessThreshold) continue;

    // Find relevant Materials chunks
    let contextChunks: string[] = [];
    let sourceChunkIds: string[] = [];
    if (materialFileIds.length > 0) {
      try {
        const [emb] = await embedChunks([{ chunkIndex: 0, text: qa.prompt + " " + qb.prompt }]);
        const results = await searchChunks(emb.vector, folderId, materialFileIds, 4);
        contextChunks = results.map((r) => `[${r.id}]\n${r.text}`);
        sourceChunkIds = results.map((r) => r.id);
      } catch {
        // non-fatal
      }
    }

    const contextText = contextChunks.join("\n\n---\n\n");

    const genPrompt = `You are an expert educator. Combine or restructure the following two exam questions into one new modified question that tests both concepts together. Ground the solution in the provided source material.

Question A: ${qa.prompt}
Question B: ${qb.prompt}

Source Material:
${contextText || "(no source available)"}

Return ONLY JSON:
{
  "prompt": "...",
  "answer": "...",
  "answer_type": "numeric" | "mc",
  "options": ["..."] or null,
  "solution_methodology": "step-by-step solution citing the source material",
  "time_limit_bucket": "lt5" | "lt15" | "gt15"
}`;

    let modifiedRaw: string;
    try {
      modifiedRaw = await llmClient.complete(genPrompt, { jsonMode: true, temperature: 0.5 });
    } catch {
      continue;
    }

    let modified: {
      prompt: string;
      answer: string;
      answer_type: "numeric" | "mc";
      options?: string[];
      solution_methodology: string;
      time_limit_bucket: TimeLimitBucket;
    };
    try {
      modified = JSON.parse(modifiedRaw);
    } catch {
      continue;
    }

    // Pass 2 — concept retention: does the generated question still cover the original concepts?
    if (contextChunks.length > 0) {
      let retentionScore: number;
      try {
        retentionScore = await jevScore(
          modified.prompt,
          contextChunks.join(" ").slice(0, 2000)
        );
      } catch {
        retentionScore = 1; // If Jev fails, assume pass
      }
      if (retentionScore < settings.conceptRetentionThreshold) continue;
    }

    // Save
    const qId = randomUUID();
    const answer: ExamModifiedAnswer = {
      answer: modified.answer,
      answer_type: modified.answer_type,
      options: modified.options,
      solution_methodology: modified.solution_methodology,
      source_chunk_ids: sourceChunkIds,
      time_limit_bucket: modified.time_limit_bucket,
    };

    db.prepare(
      "INSERT INTO questions (id, folder_id, file_id, type, prompt, answer_json, source_ref, time_limit_bucket) VALUES (?, ?, ?, 'exam_modified', ?, ?, ?, ?)"
    ).run(
      qId,
      folderId,
      qa.file_id, // associate with first source file
      modified.prompt,
      JSON.stringify(answer),
      sourceChunkIds[0] ?? null,
      modified.time_limit_bucket
    );

    db.prepare(
      "INSERT OR IGNORE INTO sr_state (question_id, ease_factor, interval_days, due_date, repetitions) VALUES (?, 2.5, 1, date('now'), 0)"
    ).run(qId);

    generated++;
  }

  return generated;
}
