import { IpcMain } from "electron";
import { randomUUID } from "crypto";
import { getDb } from "./index";
import type { ContentFolder, ContentFile } from "./types";

export function setupDbHandlers(ipcMain: IpcMain): void {
  const db = getDb();

  // ── Content folders ──────────────────────────────────
  ipcMain.handle("list-content-folders", (): ContentFolder[] => {
    return db.prepare("SELECT * FROM content_folders ORDER BY name").all() as ContentFolder[];
  });

  ipcMain.handle(
    "create-content-folder",
    (_event, name: string): ContentFolder => {
      const id = randomUUID();
      db.prepare(
        "INSERT INTO content_folders (id, name) VALUES (?, ?)"
      ).run(id, name);
      return db
        .prepare("SELECT * FROM content_folders WHERE id = ?")
        .get(id) as ContentFolder;
    }
  );

  // ── Content files ────────────────────────────────────
  ipcMain.handle(
    "list-files-for-folder",
    (_event, folderId: string): ContentFile[] => {
      return db
        .prepare(
          "SELECT * FROM content_files WHERE folder_id = ? ORDER BY filename"
        )
        .all(folderId) as ContentFile[];
    }
  );

  ipcMain.handle(
    "get-question-count-for-file",
    (_event, fileId: string): number => {
      const row = db
        .prepare(
          "SELECT COUNT(*) as cnt FROM questions WHERE file_id = ? AND is_bad = 0"
        )
        .get(fileId) as { cnt: number };
      return row.cnt;
    }
  );
}
