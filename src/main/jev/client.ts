import axios from "axios";
import { getSettings } from "../settings";
import { getDb } from "../db/index";
import type { EssentialProposition } from "../db/types";

export interface JevEvalResult {
  score: number;
  proposition_scores: Array<{ proposition: string; score: number }>;
}

export interface FeynmanEvalResult {
  pass: boolean;
  score: number;
  feedback: JevEvalResult;
}

async function callJev(
  reference_answer: string,
  propositions: string[],
  student_answer: string
): Promise<JevEvalResult> {
  const settings = getSettings();
  const res = await axios.post(
    `${settings.jevBaseUrl}/v1/evaluate`,
    { reference_answer, propositions, student_answer },
    {
      headers: {
        Authorization: `Bearer ${settings.jevKey}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data as JevEvalResult;
}

export async function evaluateFeynmanAnswer(
  questionId: string,
  userAnswer: string
): Promise<FeynmanEvalResult> {
  const db = getDb();
  const question = db
    .prepare("SELECT * FROM questions WHERE id = ?")
    .get(questionId) as { answer_json: string } | undefined;

  if (!question) throw new Error(`Question not found: ${questionId}`);

  const answerData = JSON.parse(question.answer_json) as {
    model_answer: string;
  };

  const props = db
    .prepare(
      "SELECT * FROM essential_propositions WHERE question_id = ? ORDER BY rowid"
    )
    .all(questionId) as EssentialProposition[];

  const settings = getSettings();
  const result = await callJev(
    answerData.model_answer,
    props.map((p) => p.proposition),
    userAnswer
  );

  const pass = result.score >= settings.feynmanPassThreshold;

  // Record in answer_history
  const { randomUUID } = await import("crypto");
  db.prepare(
    "INSERT INTO answer_history (id, question_id, user_answer, score) VALUES (?, ?, ?, ?)"
  ).run(randomUUID(), questionId, userAnswer, result.score);

  return { pass, score: result.score, feedback: result };
}

/** Semantic relatedness between two texts using Jev */
export async function jevScore(text1: string, text2: string): Promise<number> {
  const result = await callJev(text1, [], text2);
  return result.score;
}
