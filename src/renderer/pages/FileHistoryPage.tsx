import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useIpc } from "../hooks/useIpc";
import { SourceCitation } from "../components/QuestionCard/SourceCitation";
import styles from "./FileHistoryPage.module.css";

interface Question {
  id: string;
  type: string;
  prompt: string;
  answer_json: string;
  source_ref: string | null;
  time_limit_bucket: string | null;
  created_at: string;
  is_bad: 0 | 1;
  latest_answer: { score: number | null; answered_at: string } | null;
  due_date?: string;
}

const TYPE_LABELS: Record<string, string> = {
  mc_conceptual: "MC",
  feynman: "Feynman",
  exam_verbatim: "Exam",
  exam_modified: "Modified",
};

export function FileHistoryPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const { invoke } = useIpc();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showBad, setShowBad] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fileId) return;
    const data = await invoke<Question[]>("get-questions-for-file", { fileId });
    setQuestions(data ?? []);
  }, [invoke, fileId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkBad = async (qId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await invoke("mark-question-bad", { questionId: qId });
    load();
  };

  const visible = questions.filter((q) => showBad || q.is_bad === 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Question History</h1>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showBad}
            onChange={(e) => setShowBad(e.target.checked)}
          />
          Show flagged
        </label>
      </div>

      <div className={styles.list}>
        {visible.length === 0 ? (
          <div className={styles.empty}>No questions yet.</div>
        ) : (
          visible.map((q) => (
            <div
              key={q.id}
              className={`${styles.item} ${q.is_bad ? styles.bad : ""}`}
              onClick={() =>
                setExpanded((e) => (e === q.id ? null : q.id))
              }
            >
              <div className={styles.row}>
                <span
                  className={`${styles.badge} ${styles["badge_" + q.type]}`}
                >
                  {TYPE_LABELS[q.type] ?? q.type}
                </span>
                <span className={styles.prompt}>{q.prompt}</span>
                <span className={styles.score}>
                  {q.latest_answer?.score != null
                    ? `${(q.latest_answer.score * 100).toFixed(0)}%`
                    : "—"}
                </span>
                {q.due_date && (
                  <span className={styles.due}>{q.due_date}</span>
                )}
                {q.is_bad === 0 && (
                  <button
                    className={styles.badBtn}
                    onClick={(e) => handleMarkBad(q.id, e)}
                    title="Flag as bad"
                  >
                    🚩
                  </button>
                )}
              </div>

              {expanded === q.id && (
                <div className={styles.detail}>
                  <div className={styles.fullPrompt}>{q.prompt}</div>
                  <div className={styles.answerBox}>
                    <span className={styles.label}>Answer:</span>
                    <span>
                      {(() => {
                        try {
                          const a = JSON.parse(q.answer_json);
                          return a.answer ?? a.model_answer ?? JSON.stringify(a);
                        } catch {
                          return q.answer_json;
                        }
                      })()}
                    </span>
                  </div>
                  <SourceCitation sourceRef={q.source_ref} />
                  {q.time_limit_bucket && (
                    <div className={styles.bucket}>
                      Time bucket: {q.time_limit_bucket}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
