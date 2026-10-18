import * as path from "path";
import * as fs from "fs";
import { app } from "electron";
import type { IpcMain } from "electron";

export interface Settings {
  llmProvider: "openai" | "gemini" | "cursor";
  openaiKey: string;
  geminiKey: string;
  cursorKey: string;
  jevKey: string;
  jevBaseUrl: string;
  feynmanPassThreshold: number;
  mergeRelatenessThreshold: number;
  conceptRetentionThreshold: number;
}

const defaults: Settings = {
  llmProvider: "openai",
  openaiKey: "",
  geminiKey: "",
  cursorKey: "",
  jevKey: "",
  jevBaseUrl: "https://api.typesafe.ai",
  feynmanPassThreshold: 0.7,
  mergeRelatenessThreshold: 0.65,
  conceptRetentionThreshold: 0.6,
};

function settingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

export function getSettings(): Settings {
  const p = settingsPath();
  if (!fs.existsSync(p)) return { ...defaults };
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function setSettings(partial: Partial<Settings>): void {
  const current = getSettings();
  const updated = { ...current, ...partial };
  fs.writeFileSync(settingsPath(), JSON.stringify(updated, null, 2), "utf-8");
}

export function setupSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("get-settings", () => getSettings());
  ipcMain.handle("set-settings", (_event, partial: Partial<Settings>) => {
    setSettings(partial);
    return getSettings();
  });
}
