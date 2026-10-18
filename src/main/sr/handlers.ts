import { IpcMain } from "electron";
import { getDueQuestions, recordExamAnswer } from "./scheduler";
import { IPC } from "../../shared/ipc-channels";

export function setupSrHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC.GET_DUE_EXAM_QUESTIONS,
    (_event, { folderId }: { folderId?: string } = {}) => {
      return getDueQuestions(folderId);
    }
  );

  ipcMain.handle(
    IPC.RECORD_EXAM_ANSWER,
    (_event, { questionId, rating }: { questionId: string; rating: 1 | 3 }) => {
      recordExamAnswer(questionId, rating);
      return { ok: true };
    }
  );

  // Build deck: combines due SM-2 exam questions + pending Feynman/MC conceptual
  ipcMain.handle(
    IPC.BUILD_DECK,
    (_event, { folderId, fileId }: { folderId?: string; fileId?: string }) => {
      const { getDb } = require("../db/index");
      const db = getDb();
      const today = new Date().toISOString().slice(0, 10);

      let examQuestions: unknown[];
      let conceptualQuestions: unknown[];

      if (fileId) {
        // Single file — load questions for that file
        examQuestions = db
          .prepare(
            `SELECT q.*, s.ease_factor, s.interval_days, s.due_date, s.repetitions
             FROM questions q
             JOIN sr_state s ON s.question_id = q.id
             WHERE q.file_id = ? AND q.type IN ('exam_verbatim', 'exam_modified')
               AND q.is_bad = 0 AND s.due_date <= ?`
          )
          .all(fileId, today);

        conceptualQuestions = db
          .prepare(
            "SELECT * FROM questions WHERE file_id = ? AND type IN ('mc_conceptual', 'feynman') AND is_bad = 0"
          )
          .all(fileId);
      } else if (folderId) {
        examQuestions = db
          .prepare(
            `SELECT q.*, s.ease_factor, s.interval_days, s.due_date, s.repetitions
             FROM questions q
             JOIN sr_state s ON s.question_id = q.id
             WHERE q.folder_id = ? AND q.type IN ('exam_verbatim', 'exam_modified')
               AND q.is_bad = 0 AND s.due_date <= ?`
          )
          .all(folderId, today);

        conceptualQuestions = db
          .prepare(
            "SELECT * FROM questions WHERE folder_id = ? AND type IN ('mc_conceptual', 'feynman') AND is_bad = 0"
          )
          .all(folderId);
      } else {
        examQuestions = [];
        conceptualQuestions = [];
      }

      return [...examQuestions, ...conceptualQuestions];
    }
  );
}
