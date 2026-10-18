import React, { useState, useCallback } from "react";
import styles from "./VoiceInput.module.css";

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  const SpeechRec = win.SpeechRecognition ?? win.webkitSpeechRecognition;

  const startListening = useCallback(() => {
    if (!SpeechRec) {
      alert("Speech recognition is not available in this browser.");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };
    recognition.onresult = (event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => {
      let interimT = "";
      let finalT = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalT += t;
        else interimT += t;
      }
      setInterim(interimT);
      if (finalT) onTranscript(finalT);
    };
    recognition.start();
  }, [SpeechRec, onTranscript]);

  if (!SpeechRec) return null;

  return (
    <div className={styles.container}>
      <button
        className={`${styles.micBtn} ${listening ? styles.active : ""}`}
        onClick={startListening}
        disabled={disabled || listening}
        title={listening ? "Listening…" : "Start voice input"}
      >
        🎤
      </button>
      {interim && <span className={styles.interim}>{interim}</span>}
    </div>
  );
}
