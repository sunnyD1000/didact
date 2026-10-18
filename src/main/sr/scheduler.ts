import { randomUUID } from "crypto";
import { getDb } from "../db/index";
import { updateSM2 } from "./sm2";
import type { Question, SrState } from "../db/types";

/** Return all exam questions (verbatim + modified) due today or earlier */
export function getDueQuestions(folderId?: string): Array<Question & SrState> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const query = folderId
    ? `SELECT q.*, s.ease_factor, s.interval_days, s.due_date, s.repetitions
       FROM questions q
       JOIN sr_state s ON s.question_id = q.id
       WHERE q.folder_id = ?
         AND q.type IN ('exam_verbatim', 'exam_modified')
         AND q.is_bad = 0
         AND s.due_date <= ?
       ORDER BY s.due_date ASC`
    : `SELECT q.*, s.ease_factor, s.interval_days, s.due_date, s.repetitions
       FROM questions q
       JOIN sr_state s ON s.question_id = q.id
       WHERE q.type IN ('exam_verbatim', 'exam_modified')
         AND q.is_bad = 0
         AND s.due_date <= ?
       ORDER BY s.due_date ASC`;

  return (
    folderId
      ? db.prepare(query).all(folderId, today)
      : db.prepare(query).all(today)
  ) as Array<Question & SrState>;
}

export function recordExamAnswer(questionId: string, rating: 1 | 3): void {
  const db = getDb();
  const state = db
    .prepare("SELECT * FROM sr_state WHERE question_id = ?")
    .get(questionId) as SrState | undefined;

  if (!state) throw new Error(`No SR state for question: ${questionId}`);

  const newState = updateSM2(state, rating);

  db.prepare(
    "UPDATE sr_state SET ease_factor = ?, interval_days = ?, due_date = ?, repetitions = ? WHERE question_id = ?"
  ).run(
    newState.ease_factor,
    newState.interval_days,
    newState.due_date,
    newState.repetitions,
    questionId
  );

  db.prepare(
    "INSERT INTO answer_history (id, question_id, user_answer, score) VALUES (?, ?, ?, ?)"
  ).run(randomUUID(), questionId, String(rating), rating === 3 ? 1.0 : 0.0);
}
