import React, { useState } from "react";
import { useIpc } from "../../hooks/useIpc";
import { VoiceInput } from "../VoiceInput";
import { SourceCitation } from "./SourceCitation";
import styles from "./FeynmanQuestion.module.css";

interface FeynmanAnswer {
  model_answer: string;
  source_chunk_id?: string;
}

interface JevResult {
  pass: boolean;
  score: number;
  feedback: {
    score: number;
    proposition_scores: Array<{ proposition: string; score: number }>;
  };
}

interface Props {
  question: { id: string; prompt: string; answer_json: string; source_ref: string | null };
  onResult: (pass: boolean) => void;
}

export function FeynmanQuestion({ question, onResult }: Props) {
  const { invoke } = useIpc();
  const answer: FeynmanAnswer = JSON.parse(question.answer_json);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<JevResult | null>(null);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await invoke<JevResult>("evaluate-feynman-answer", {
        questionId: question.id,
        userAnswer: text,
      });
      if (res) {
        setResult(res);
        onResult(res.pass);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const appendTranscript = (t: string) =>
    setText((prev) => (prev ? prev + " " + t : t));

  return (
    <div className={styles.card}>
      <p className={styles.prompt}>{question.prompt}</p>

      {!result ? (
        <div className={styles.inputArea}>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your explanation here…"
            rows={5}
            disabled={submitting}
          />
          <div className={styles.actions}>
            <VoiceInput onTranscript={appendTranscript} disabled={submitting} />
            <button
              className={styles.submitBtn}
              onClick={submit}
              disabled={submitting || !text.trim()}
            >
              {submitting ? "Evaluating…" : "Submit"}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.results}>
          <div
            className={`${styles.scoreBadge} ${result.pass ? styles.pass : styles.fail}`}
          >
            {result.pass ? "✓ Pass" : "✗ Fail"} — Score:{" "}
            {(result.score * 100).toFixed(0)}%
          </div>

          <div className={styles.modelAnswer}>
            <div className={styles.label}>Model Answer</div>
            <p>{answer.model_answer}</p>
          </div>

          <div className={styles.propositions}>
            <div className={styles.label}>Proposition Breakdown</div>
            {result.feedback.proposition_scores.map((ps, i) => (
              <div key={i} className={styles.prop}>
                <span
                  className={
                    ps.score >= 0.5 ? styles.propPass : styles.propFail
                  }
                >
                  {ps.score >= 0.5 ? "✓" : "✗"}
                </span>
                <span>{ps.proposition}</span>
                <span className={styles.propScore}>
                  {(ps.score * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <SourceCitation
          sourceRef={answer.source_chunk_id ?? question.source_ref}
        />
      )}
    </div>
  );
}
