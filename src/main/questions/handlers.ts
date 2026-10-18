import { IpcMain } from "electron";
import { generateMaterialMC } from "./materialsMC";
import { generateFeynmanQuestions } from "./feynman";
import { extractExamQuestions } from "./examExtract";
import { generateModifiedQuestions } from "./modifiedExam";
import { evaluateFeynmanAnswer } from "../jev/client";
import { getDb } from "../db/index";
import { IPC } from "../../shared/ipc-channels";
import type { Question, AnswerHistory } from "../db/types";

export function setupQuestionHandlers(ipcMain: IpcMain): void {
  const db = getDb();

  // ── Material question generation ──────────────────────
  ipcMain.handle(
    IPC.GENERATE_MATERIAL_QUESTIONS,
    async (
      _event,
      {
        fileId,
        folderId,
        types,
        count,
      }: { fileId: string; folderId: string; types: ("mc" | "feynman")[]; count?: number }
    ) => {
      const jobs: Promise<void>[] = [];
      if (types.includes("mc")) jobs.push(generateMaterialMC(folderId, fileId, count ?? 5));
      if (types.includes("feynman")) jobs.push(generateFeynmanQuestions(folderId, fileId, count ?? 5));
      await Promise.all(jobs);
      return { ok: true };
    }
  );

  // ── Exam extraction ────────────────────────────────────
  ipcMain.handle(
    IPC.EXTRACT_EXAM_QUESTIONS,
    async (_event, { fileId, folderId }: { fileId: string; folderId: string }) => {
      await extractExamQuestions(folderId, fileId);
      return { ok: true };
    }
  );

  // ── Modified question generation ───────────────────────
  ipcMain.handle(
    IPC.GENERATE_MODIFIED_QUESTIONS,
    async (_event, { folderId }: { folderId: string }) => {
      const generated = await generateModifiedQuestions(folderId);
      return { generated };
    }
  );

  // ── Feynman evaluation ─────────────────────────────────
  ipcMain.handle(
    IPC.EVALUATE_FEYNMAN_ANSWER,
    async (_event, { questionId, userAnswer }: { questionId: string; userAnswer: string }) => {
      return evaluateFeynmanAnswer(questionId, userAnswer);
    }
  );

  // ── Mark question bad ──────────────────────────────────
  ipcMain.handle(
    IPC.MARK_QUESTION_BAD,
    (_event, { questionId }: { questionId: string }) => {
      db.prepare("UPDATE questions SET is_bad = 1 WHERE id = ?").run(questionId);
      return { ok: true };
    }
  );

  // ── Set time limit bucket override ────────────────────
  ipcMain.handle(
    IPC.SET_TIME_LIMIT_BUCKET,
    (_event, { questionId, bucket }: { questionId: string; bucket: string }) => {
      db.prepare("UPDATE questions SET time_limit_bucket = ? WHERE id = ?").run(
        bucket,
        questionId
      );
      return { ok: true };
    }
  );

  // ── Get questions for file ─────────────────────────────
  ipcMain.handle(
    IPC.GET_QUESTIONS_FOR_FILE,
    (_event, { fileId }: { fileId: string }) => {
      const questions = db
        .prepare("SELECT * FROM questions WHERE file_id = ? ORDER BY created_at DESC")
        .all(fileId) as Question[];

      const withHistory = questions.map((q) => {
        const latest = db
          .prepare(
            "SELECT * FROM answer_history WHERE question_id = ? ORDER BY answered_at DESC LIMIT 1"
          )
          .get(q.id) as AnswerHistory | undefined;
        return { ...q, latest_answer: latest ?? null };
      });

      return withHistory;
    }
  );
}
