import React, { useState } from "react";
import { SourceCitation } from "./SourceCitation";
import styles from "./MCQuestion.module.css";

interface McAnswer {
  options: string[];
  correct: number;
  source_chunk_id?: string;
}

interface Props {
  question: { id: string; prompt: string; answer_json: string; source_ref: string | null };
  onAnswer: (correct: boolean) => void;
}

export function MCQuestion({ question, onAnswer }: Props) {
  const answer: McAnswer = JSON.parse(question.answer_json);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    onAnswer(idx === answer.correct);
  };

  return (
    <div className={styles.card}>
      <p className={styles.prompt}>{question.prompt}</p>
      <div className={styles.options}>
        {answer.options.map((opt, idx) => {
          let cls = styles.option;
          if (revealed) {
            if (idx === answer.correct) cls += " " + styles.correct;
            else if (idx === selected) cls += " " + styles.wrong;
          }
          return (
            <button key={idx} className={cls} onClick={() => handleSelect(idx)}>
              <span className={styles.letter}>
                {["A", "B", "C", "D"][idx]}.
              </span>{" "}
              {opt}
            </button>
          );
        })}
      </div>
      {revealed && (
        <SourceCitation sourceRef={answer.source_chunk_id ?? question.source_ref} />
      )}
    </div>
  );
}
