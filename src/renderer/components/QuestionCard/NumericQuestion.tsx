import React, { useState } from "react";
import { SourceCitation } from "./SourceCitation";
import styles from "./NumericQuestion.module.css";

interface ExamAnswer {
  answer: string;
  answer_type: string;
  options?: string[];
}

interface Props {
  question: { id: string; prompt: string; answer_json: string; source_ref: string | null };
  onAnswer: (rating: 1 | 3) => void;
}

export function NumericQuestion({ question, onAnswer }: Props) {
  const answer: ExamAnswer = JSON.parse(question.answer_json);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);

  const check = () => {
    setRevealed(true);
  };

  const isNumeric = answer.answer_type === "numeric";

  return (
    <div className={styles.card}>
      <p className={styles.prompt}>{question.prompt}</p>

      {!revealed ? (
        <div className={styles.inputRow}>
          {isNumeric ? (
            <input
              type="text"
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="Your answer…"
              autoFocus
            />
          ) : (
            <div className={styles.options}>
              {(answer.options ?? []).map((opt, idx) => (
                <button
                  key={idx}
                  className={styles.option}
                  onClick={() => setRevealed(true)}
                >
                  <span className={styles.letter}>{["A", "B", "C", "D"][idx]}.</span>{" "}
                  {opt}
                </button>
              ))}
            </div>
          )}
          {isNumeric && (
            <button className={styles.checkBtn} onClick={check}>
              Check
            </button>
          )}
        </div>
      ) : (
        <div className={styles.answer}>
          <div className={styles.answerLabel}>Correct answer:</div>
          <div className={styles.answerText}>{answer.answer}</div>
          <div className={styles.rating}>
            <span>How did you do?</span>
            <button
              className={`${styles.ratingBtn} ${styles.again}`}
              onClick={() => onAnswer(1)}
            >
              1 — Again
            </button>
            <button
              className={`${styles.ratingBtn} ${styles.good}`}
              onClick={() => onAnswer(3)}
            >
              3 — Good
            </button>
          </div>
        </div>
      )}

      {revealed && <SourceCitation sourceRef={question.source_ref} />}
    </div>
  );
}
