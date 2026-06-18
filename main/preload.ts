/**
 * DevVault V2 — Preload Script
 * 
 * Bridge between the isolated renderer and the main process.
 * Exposes a controlled API surface via contextBridge.
 * 
 * The renderer can ONLY call the methods defined here.
 * It cannot access fs, child_process, or any other Node API.
 */

import { contextBridge, ipcRenderer } from "electron";

/**
 * The API surface exposed to the renderer as `window.devvault`.
 */
contextBridge.exposeInMainWorld("devvault", {
  // ── Config ──────────────────────────────────
  config: {
    get: () => ipcRenderer.invoke("config:get"),
    addFolder: (path: string, label?: string) =>
      ipcRenderer.invoke("config:addFolder", { path, label }),
    removeFolder: (path: string) =>
      ipcRenderer.invoke("config:removeFolder", { path }),
    updatePrefs: (prefs: Record<string, unknown>) =>
      ipcRenderer.invoke("config:updatePrefs", prefs),
  },

  // ── Vault ───────────────────────────────────
  vault: {
    refresh: () => ipcRenderer.invoke("vault:refresh"),
    getProjects: () => ipcRenderer.invoke("vault:getProjects"),
    getFamilies: () => ipcRenderer.invoke("vault:getFamilies"),
    getActivity: () => ipcRenderer.invoke("vault:getActivity"),
    getActivitySummary: () => ipcRenderer.invoke("vault:getActivitySummary"),
    getTimeline: () => ipcRenderer.invoke("vault:getTimeline"),
    onScanProgress: (callback: (data: { current: number; total: number; folder: string }) => void) => {
      ipcRenderer.on("vault:scanProgress", (_event, data) => callback(data));
    },
    offScanProgress: () => {
      ipcRenderer.removeAllListeners("vault:scanProgress");
    },
  },

  // ── Project ─────────────────────────────────
  project: {
    saveMeta: (id: string, meta: Record<string, unknown>) =>
      ipcRenderer.invoke("project:saveMeta", { id, meta }),
    openFolder: (path: string) =>
      ipcRenderer.invoke("project:openFolder", { path }),
    openTerminal: (path: string) =>
      ipcRenderer.invoke("project:openTerminal", { path }),
  },

  // ── Export ──────────────────────────────────
  backup: {
    export: () => ipcRenderer.invoke("export:backup"),
    restore: () => ipcRenderer.invoke("export:restore"),
  },

  // ── Dialogs ─────────────────────────────────
  dialog: {
    selectFolder: () => ipcRenderer.invoke("dialog:selectFolder"),
  },

  // ── Filesystem (read-only, for Workspace explorer) ──
  fs: {
    readDir: (dirPath: string) => ipcRenderer.invoke("fs:readDir", { dirPath }),
  },
});

