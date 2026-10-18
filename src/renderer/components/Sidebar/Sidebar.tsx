import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useIpc, useIpcListener } from "../../hooks/useIpc";
import { ContentFolder } from "./ContentFolder";
import styles from "./Sidebar.module.css";

interface ContentFolderData {
  id: string;
  name: string;
  created_at: string;
}

export function Sidebar() {
  const { invoke } = useIpc();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<ContentFolderData[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const loadFolders = useCallback(async () => {
    const result = await invoke<ContentFolderData[]>("list-content-folders");
    setFolders(result ?? []);
  }, [invoke]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Refresh sidebar when ingestion finishes
  useIpcListener("ingest-progress", (progress: unknown) => {
    const p = progress as { stage: string };
    if (p.stage === "done") loadFolders();
  });

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await invoke("create-content-folder", name);
    setNewName("");
    setCreating(false);
    loadFolders();
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.logo}>Didact</span>
      </div>

      <div className={styles.folders}>
        {folders.map((f) => (
          <ContentFolder key={f.id} folder={f} onRefresh={loadFolders} />
        ))}
      </div>

      <div className={styles.footer}>
        {creating ? (
          <div className={styles.newFolder}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              placeholder="Folder name…"
              className={styles.input}
            />
            <button className={styles.btnPrimary} onClick={handleCreate}>
              Create
            </button>
          </div>
        ) : (
          <button
            className={styles.newFolderBtn}
            onClick={() => setCreating(true)}
          >
            + New Content Folder
          </button>
        )}
        <button
          className={styles.settingsBtn}
          onClick={() => navigate("/settings")}
          title="Settings"
        >
          ⚙ Settings
        </button>
      </div>
    </aside>
  );
}
