import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { IPC } from "./shared/ipc-channels";

// Expose a typed API to the renderer via window.didact
contextBridge.exposeInMainWorld("didact", {
  // Generic invoke (request/response)
  invoke: (channel: string, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args),

  // Generic one-way listener (main → renderer push events)
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    const wrapped = (_event: IpcRendererEvent, ...args: unknown[]) =>
      listener(...args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },

  // Expose channel constants so renderer doesn't import Node modules
  IPC,
});
