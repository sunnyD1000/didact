import { IpcMain, BrowserWindow } from "electron";
import { dialog } from "electron";
import { ingestFile } from "./index";
import { getChunkById } from "./lancedb";
import { IPC } from "../../shared/ipc-channels";

export function setupIngestHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC.INGEST_FILE,
    async (
      event,
      {
        folderId,
        fileType,
      }: { folderId: string; fileType: "material" | "examination" }
    ) => {
      const win = BrowserWindow.fromWebContents(event.sender);

      // Open file picker
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
          {
            name: "Documents & Images",
            extensions: ["pdf", "docx", "doc", "txt", "md", "png", "jpg", "jpeg", "webp"],
          },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) return null;

      const filepath = result.filePaths[0];

      const contentFile = await ingestFile(folderId, filepath, fileType, (progress) => {
        win?.webContents.send(IPC.INGEST_PROGRESS, progress);
      });

      return contentFile;
    }
  );

  // Fetch a single LanceDB chunk by its ID (used by SourceCitation component)
  ipcMain.handle("get-chunk-by-id", async (_event, chunkId: string) => {
    return getChunkById(chunkId);
  });
}
