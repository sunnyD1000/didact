import React, { useState, useEffect } from "react";
import { useIpc } from "../../hooks/useIpc";
import styles from "./SourceCitation.module.css";

interface Props {
  sourceRef: string | null | undefined;
}

export function SourceCitation({ sourceRef }: Props) {
  const { invoke } = useIpc();
  const [text, setText] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!sourceRef) return;
    // Fetch chunk text via IPC — we expose a handler for this
    invoke<{ text: string } | null>("get-chunk-by-id", sourceRef).then((c) => {
      if (c) setText(c.text);
    });
  }, [sourceRef, invoke]);

  if (!sourceRef || !text) return null;

  return (
    <div className={styles.citation}>
      <button
        className={styles.toggle}
        onClick={() => setExpanded((e) => !e)}
      >
        📎 Source {expanded ? "▾" : "▸"}
      </button>
      {expanded && <pre className={styles.text}>{text}</pre>}
    </div>
  );
}
