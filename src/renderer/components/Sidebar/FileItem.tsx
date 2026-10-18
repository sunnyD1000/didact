import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIpc } from "../../hooks/useIpc";
import styles from "./FileItem.module.css";

interface ContentFile {
  id: string;
  folder_id: string;
  type: "material" | "examination";
  filename: string;
  filepath: string;
  embedded_at: string | null;
}

interface Props {
  file: ContentFile;
  folderId: string;
  onRefresh: () => void;
}

export function FileItem({ file, folderId, onRefresh }: Props) {
  const { invoke } = useIpc();
  const navigate = useNavigate();
  const [count, setCount] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    invoke<number>("get-question-count-for-file", file.id).then((n) =>
      setCount(n ?? 0)
    );
  }, [file.id, invoke]);

  const handleGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setGenerating(true);
    try {
      if (file.type === "material") {
        await invoke("generate-material-questions", {
          fileId: file.id,
          folderId,
          types: ["mc", "feynman"],
          count: 5,
        });
      } else {
        await invoke("extract-exam-questions", {
          fileId: file.id,
          folderId,
        });
      }
      const n = await invoke<number>("get-question-count-for-file", file.id);
      setCount(n ?? 0);
      onRefresh();
    } catch (err) {
      console.error("Question generation failed", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      className={styles.item}
      onClick={() => navigate(`/history/${file.id}`)}
      title={file.filepath}
    >
      <span className={styles.filename}>{file.filename}</span>
      <span className={styles.badges}>
        {count !== null && count > 0 && (
          <span className={styles.badge}>{count}Q</span>
        )}
        <span
          className={styles.genBtn}
          onClick={handleGenerate}
          title={
            file.type === "material"
              ? "Generate questions"
              : "Extract questions"
          }
        >
          {generating ? "…" : file.type === "material" ? "✦" : "⬇"}
        </span>
      </span>
    </button>
  );
}
