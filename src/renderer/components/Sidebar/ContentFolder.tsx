import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useIpc } from "../../hooks/useIpc";
import { SubFolder } from "./SubFolder";
import styles from "./ContentFolder.module.css";

interface Props {
  folder: { id: string; name: string };
  onRefresh: () => void;
}

interface ContentFile {
  id: string;
  folder_id: string;
  type: "material" | "examination";
  filename: string;
  filepath: string;
  embedded_at: string | null;
}

export function ContentFolder({ folder, onRefresh }: Props) {
  const { invoke } = useIpc();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState<ContentFile[]>([]);

  const loadFiles = useCallback(async () => {
    const result = await invoke<ContentFile[]>("list-files-for-folder", folder.id);
    setFiles(result ?? []);
  }, [invoke, folder.id]);

  useEffect(() => {
    if (expanded) loadFiles();
  }, [expanded, loadFiles]);

  const materialFiles = files.filter((f) => f.type === "material");
  const examFiles = files.filter((f) => f.type === "examination");

  return (
    <div className={styles.folder}>
      <button
        className={styles.folderHeader}
        onClick={() => setExpanded((e) => !e)}
      >
        <span className={styles.arrow}>{expanded ? "▾" : "▸"}</span>
        <span className={styles.name}>{folder.name}</span>
        {(materialFiles.length + examFiles.length) > 0 && (
          <span className={styles.count}>
            {materialFiles.length + examFiles.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className={styles.subFolders}>
          <SubFolder
            label="Materials"
            files={materialFiles}
            folderId={folder.id}
            fileType="material"
            onRefresh={loadFiles}
          />
          <SubFolder
            label="Examinations"
            files={examFiles}
            folderId={folder.id}
            fileType="examination"
            onRefresh={loadFiles}
          />
          <button
            className={styles.studyBtn}
            onClick={() => navigate(`/study/${folder.id}`)}
          >
            ▶ Study Folder
          </button>
        </div>
      )}
    </div>
  );
}
