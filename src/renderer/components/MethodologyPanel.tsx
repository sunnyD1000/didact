import React, { useState } from "react";
import styles from "./MethodologyPanel.module.css";

interface Props {
  methodology: string;
  sourceChunkIds: string[];
}

export function MethodologyPanel({ methodology, sourceChunkIds }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${styles.panel} ${open ? styles.open : ""}`}>
      <button
        className={styles.toggle}
        onClick={() => setOpen((o) => !o)}
        title="Show solution methodology"
      >
        {open ? "▸ Methodology" : "⊞ Methodology"}
      </button>
      {open && (
        <div className={styles.content}>
          <div className={styles.section}>
            <div className={styles.label}>Solution Methodology</div>
            <pre className={styles.text}>{methodology}</pre>
          </div>
          {sourceChunkIds.length > 0 && (
            <div className={styles.section}>
              <div className={styles.label}>Source Chunk IDs</div>
              <div className={styles.chunks}>
                {sourceChunkIds.map((id) => (
                  <span key={id} className={styles.chunkId}>
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
