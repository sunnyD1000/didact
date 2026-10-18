import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useIpc } from "../hooks/useIpc";
import { MCQuestion } from "../components/QuestionCard/MCQuestion";
import { NumericQuestion } from "../components/QuestionCard/NumericQuestion";
import { FeynmanQuestion } from "../components/QuestionCard/FeynmanQuestion";
import { MethodologyPanel } from "../components/MethodologyPanel";
import styles from "./StudyPage.module.css";

interface Question {
  id: string;
  folder_id: string;
  file_id: string;
  type: "mc_conceptual" | "feynman" | "exam_verbatim" | "exam_modified";
  prompt: string;
  answer_json: string;
  source_ref: string | null;
  time_limit_bucket: string | null;
}

interface SessionStats {
  total: number;
  correct: number;
  startTime: number;
}

export function StudyPage() {
  const params = useParams<{ folderId?: string; fileId?: string }>();
  const { invoke } = useIpc();

  const [deck, setDeck] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [stats, setStats] = useState<SessionStats>({
    total: 0,
    correct: 0,
    startTime: Date.now(),
  });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDeck = useCallback(async () => {
    setLoading(true);
    const deckData = await invoke<Question[]>("build-deck", {
      folderId: params.folderId,
      fileId: params.fileId,
    });
    setDeck(deckData ?? []);
    setCurrentIdx(0);
    setDone(!deckData || deckData.length === 0);
    setLoading(false);
    setStats({ total: deckData?.length ?? 0, correct: 0, startTime: Date.now() });
  }, [invoke, params.folderId, params.fileId]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  const advance = (pass: boolean) => {
    setStats((s) => ({ ...s, correct: s.correct + (pass ? 1 : 0) }));
    const next = currentIdx + 1;
    if (next >= deck.length) {
      setDone(true);
    } else {
      setCurrentIdx(next);
    }
  };

  /** Feynman fail: re-queue after up to 3 positions */
  const handleFeynmanResult = (pass: boolean) => {
    if (!pass) {
      const q = deck[currentIdx];
      const newDeck = [...deck];
      newDeck.splice(currentIdx, 1);
      const insertAt = Math.min(currentIdx + 3, newDeck.length);
      newDeck.splice(insertAt, 0, q);
      setDeck(newDeck);
    }
    advance(pass);
  };

  /** MC conceptual: just advance (pass/fail both go to end of deck for fails) */
  const handleMcResult = (correct: boolean) => {
    if (!correct) {
      const q = deck[currentIdx];
      const newDeck = [...deck];
      newDeck.splice(currentIdx, 1);
      newDeck.push(q);
      setDeck(newDeck);
    }
    advance(correct);
  };

  /** SM-2 exam: record answer and advance */
  const handleExamRating = async (rating: 1 | 3) => {
    const q = deck[currentIdx];
    await invoke("record-exam-answer", { questionId: q.id, rating });
    advance(rating === 3);
  };

  if (loading) {
    return <div className={styles.center}>Loading deck…</div>;
  }

  if (done || deck.length === 0) {
    const elapsed = Math.round((Date.now() - stats.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return (
      <div className={styles.summary}>
        <h2>Session Complete 🎉</h2>
        <div className={styles.stat}>
          Questions: {stats.total}
        </div>
        <div className={styles.stat}>
          Correct: {stats.correct} / {stats.total} (
          {stats.total > 0
            ? Math.round((stats.correct / stats.total) * 100)
            : 0}
          %)
        </div>
        <div className={styles.stat}>
          Time: {mins}m {secs}s
        </div>
        <button className={styles.restartBtn} onClick={loadDeck}>
          Study Again
        </button>
      </div>
    );
  }

  const current = deck[currentIdx];
  const modifiedAnswer =
    current.type === "exam_modified"
      ? (() => {
          try {
            return JSON.parse(current.answer_json) as {
              solution_methodology: string;
              source_chunk_ids: string[];
            };
          } catch {
            return null;
          }
        })()
      : null;

  const isExam =
    current.type === "exam_verbatim" || current.type === "exam_modified";
  const isMcExam = isExam && (() => {
    try {
      return JSON.parse(current.answer_json).answer_type === "mc";
    } catch {
      return false;
    }
  })();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.progress}>
          {currentIdx + 1} / {deck.length}
        </div>
        <div className={styles.typeBadge}>{current.type.replace("_", " ")}</div>
        {current.time_limit_bucket && (
          <div className={styles.timeBucket}>
            {
              {
                lt5: "⚡ &lt;5 min",
                lt15: "⏱ &lt;15 min",
                gt15: "⏳ &gt;15 min",
              }[current.time_limit_bucket]
            }
          </div>
        )}
      </div>

      <div className={styles.questionArea}>
        {current.type === "mc_conceptual" && (
          <MCQuestion question={current} onAnswer={handleMcResult} />
        )}
        {current.type === "feynman" && (
          <FeynmanQuestion question={current} onResult={handleFeynmanResult} />
        )}
        {isExam && !isMcExam && (
          <NumericQuestion question={current} onAnswer={handleExamRating} />
        )}
        {isExam && isMcExam && (
          <MCQuestion
            question={current}
            onAnswer={(correct) => handleExamRating(correct ? 3 : 1)}
          />
        )}

        {modifiedAnswer && (
          <MethodologyPanel
            methodology={modifiedAnswer.solution_methodology}
            sourceChunkIds={modifiedAnswer.source_chunk_ids}
          />
        )}
      </div>
    </div>
  );
}
