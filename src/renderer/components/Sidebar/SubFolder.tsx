import React, { useState } from "react";
import { useIpc, useIpcListener } from "../../hooks/useIpc";
import { FileItem } from "./FileItem";
import styles from "./SubFolder.module.css";
import type { IngestProgress } from "./types";

interface ContentFile {
  id: string;
  folder_id: string;
  type: "material" | "examination";
  filename: string;
  filepath: string;
  embedded_at: string | null;
}

interface Props {
  label: string;
  files: ContentFile[];
  folderId: string;
  fileType: "material" | "examination";
  onRefresh: () => void;
}

export function SubFolder({ label, files, folderId, fileType, onRefresh }: Props) {
  const { invoke } = useIpc();
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState("");

  useIpcListener("ingest-progress", (progress: unknown) => {
    const p = progress as IngestProgress;
    setIngestMsg(p.message);
    if (p.stage === "done" || p.stage === "error") {
      setIngesting(false);
      onRefresh();
    }
  });

  const handleUpload = async () => {
    setIngesting(true);
    setIngestMsg("Opening file…");
    try {
      await invoke("ingest-file", { folderId, fileType });
    } catch (err) {
      setIngesting(false);
      setIngestMsg("");
    }
  };

  return (
    <div className={styles.subFolder}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <button
          className={styles.uploadBtn}
          onClick={handleUpload}
          disabled={ingesting}
          title={`Upload ${label} file`}
        >
          {ingesting ? "…" : "+"}
        </button>
      </div>

      {ingesting && <div className={styles.progress}>{ingestMsg}</div>}

      <div className={styles.files}>
        {files.length === 0 ? (
          <span className={styles.empty}>No files</span>
        ) : (
          files.map((f) => (
            <FileItem
              key={f.id}
              file={f}
              folderId={folderId}
              onRefresh={onRefresh}
            />
          ))
        )}
      </div>
    </div>
  );
}
