// Minimal electron mock for unit tests
export const app = {
  getPath: (_name: string) => "/tmp/didact-test",
  isPackaged: false,
};
export const ipcMain = {};
export const BrowserWindow = {};
export const dialog = {};
