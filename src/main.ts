import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { setupSettingsHandlers } from "./main/settings";
import { setupDbHandlers } from "./main/db/handlers";
import { setupIngestHandlers } from "./main/ingest/handlers";
import { setupQuestionHandlers } from "./main/questions/handlers";
import { setupSrHandlers } from "./main/sr/handlers";
import { migrateDb } from "./main/db/migrate";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    backgroundColor: "#1a1a2e",
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Run DB migrations before opening window
  migrateDb();

  // Register all IPC handlers
  setupSettingsHandlers(ipcMain);
  setupDbHandlers(ipcMain);
  setupIngestHandlers(ipcMain);
  setupQuestionHandlers(ipcMain);
  setupSrHandlers(ipcMain);

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

export { mainWindow };
