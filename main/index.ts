/**
 * DevVault V2 — Main Process Entry Point
 * 
 * Creates the Electron BrowserWindow and initializes the application.
 * 
 * Security configuration:
 * - contextIsolation: true  → Renderer cannot access Node APIs
 * - nodeIntegration: false  → Renderer runs in sandboxed context
 * - preload script bridges specific IPC channels only
 */

import { app, BrowserWindow } from "electron";
import * as path from "path";
import { registerIpcHandlers } from "./ipc-registry";

let mainWindow: BrowserWindow | null = null;

/**
 * Create the main application window.
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: "DevVault",
    backgroundColor: "#0a0a0f",
    show: false,  // Show after ready-to-show to prevent flash
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load the renderer HTML
  mainWindow.loadFile(path.join(__dirname, "..", "..", "renderer", "index.html"));

  // Show window when ready (prevents white flash)
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Clean up reference on close
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Register IPC handlers and create window when Electron is ready.
 */
app.whenReady().then(() => {
  registerIpcHandlers(() => mainWindow);
  createWindow();

  // macOS: re-create window when dock icon is clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Quit when all windows are closed (except on macOS).
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
