/**
 * DevVault V2 — IPC Registry
 * 
 * Central registration point for all IPC channels.
 * This file connects renderer requests to the appropriate services.
 * 
 * All channels use ipcMain.handle (async request-response pattern).
 * No channels exist for destructive operations (delete, wipe, etc.).
 */

import { ipcMain, shell, BrowserWindow } from "electron";
import * as fs from "fs";
import * as path from "path";
import { IProjectMeta } from "./models/project.model";
import { getConfig, addWatchedFolder, removeWatchedFolder, updatePreferences, recordScanTimestamp } from "./services/config.service";
import { scanAllFolders } from "./services/scanner.service";
import { saveProjectMeta } from "./services/metadata.service";
import { buildVersionFamilies } from "./services/family.service";
import { classifyProjects, getActivitySummary } from "./services/activity.service";
import { buildTimeline } from "./services/timeline.service";
import { exportBackup, importBackup } from "./services/export.service";
import { loadProjects, saveProjects } from "./persistence/projects-store";

/**
 * In-memory project cache.
 * Updated on each scan, read by all get operations.
 */
let projectCache: import("./models/project.model").IProject[] = [];

/**
 * Register all IPC handlers.
 * Called once during app initialization.
 */
export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  // ═══════════════════════════════════════════
  // CONFIG CHANNELS
  // ═══════════════════════════════════════════

  ipcMain.handle("config:get", async () => {
    return await getConfig();
  });

  ipcMain.handle("config:addFolder", async (_event, args: { path: string; label?: string }) => {
    return await addWatchedFolder(args.path, args.label);
  });

  ipcMain.handle("config:removeFolder", async (_event, args: { path: string }) => {
    return await removeWatchedFolder(args.path);
  });

  ipcMain.handle("config:updatePrefs", async (_event, args: Partial<import("./models/config.model").IPreferences>) => {
    return await updatePreferences(args);
  });

  // ═══════════════════════════════════════════
  // VAULT CHANNELS
  // ═══════════════════════════════════════════

  ipcMain.handle("vault:refresh", async () => {
    const config = await getConfig();
    const existing = await loadProjects();
    const mainWindow = getMainWindow();

    projectCache = await scanAllFolders(config.watchedFolders, existing, mainWindow);

    // Persist updated project list
    await saveProjects(projectCache);
    await recordScanTimestamp();

    return projectCache;
  });

  ipcMain.handle("vault:getProjects", async () => {
    if (projectCache.length === 0) {
      projectCache = await loadProjects();
    }
    return projectCache;
  });

  // ═══════════════════════════════════════════
  // PROJECT CHANNELS
  // ═══════════════════════════════════════════

  ipcMain.handle("project:saveMeta", async (_event, args: { id: string; meta: IProjectMeta }) => {
    // Find the project in the cache
    const project = projectCache.find((p) => p.id === args.id);
    if (!project) {
      throw new Error(`Project not found: ${args.id}`);
    }

    // Save to project-info.json inside the project directory
    await saveProjectMeta(project.absolutePath, args.meta);

    // Update the in-memory cache
    Object.assign(project, args.meta);

    // Persist to projects.json
    await saveProjects(projectCache);

    return args.meta;
  });

  ipcMain.handle("project:openFolder", async (_event, args: { path: string }) => {
    await shell.openPath(args.path);
  });

  ipcMain.handle("project:openTerminal", async (_event, args: { path: string }) => {
    // Open terminal at the specified path (Windows)
    const { exec } = require("child_process");
    exec(`start cmd /k "cd /d ${args.path}"`, { cwd: args.path });
  });

  // ═══════════════════════════════════════════
  // DERIVED DATA CHANNELS
  // ═══════════════════════════════════════════

  ipcMain.handle("vault:getFamilies", async () => {
    if (projectCache.length === 0) {
      projectCache = await loadProjects();
    }
    return buildVersionFamilies(projectCache);
  });

  ipcMain.handle("vault:getActivity", async () => {
    if (projectCache.length === 0) {
      projectCache = await loadProjects();
    }
    return classifyProjects(projectCache);
  });

  ipcMain.handle("vault:getActivitySummary", async () => {
    if (projectCache.length === 0) {
      projectCache = await loadProjects();
    }
    return getActivitySummary(projectCache);
  });

  ipcMain.handle("vault:getTimeline", async () => {
    if (projectCache.length === 0) {
      projectCache = await loadProjects();
    }
    return buildTimeline(projectCache);
  });

  // ═══════════════════════════════════════════
  // EXPORT CHANNELS
  // ═══════════════════════════════════════════

  ipcMain.handle("export:backup", async () => {
    const config = await getConfig();
    const projects = projectCache.length > 0 ? projectCache : await loadProjects();
    return await exportBackup(config, projects);
  });

  ipcMain.handle("export:restore", async () => {
    const backup = await importBackup();
    if (!backup) return null;

    // Restore config and projects
    const { saveConfig } = await import("./persistence/config-store");
    await saveConfig(backup.config);
    await saveProjects(backup.projects);
    projectCache = backup.projects;

    return backup.projects;
  });

  // ═══════════════════════════════════════════
  // FILESYSTEM CHANNELS
  // ═══════════════════════════════════════════

  ipcMain.handle("fs:readDir", async (_event, args: { dirPath: string }) => {
    try {
      const entries = fs.readdirSync(args.dirPath, { withFileTypes: true });
      return entries
        .map((entry) => {
          const fullPath = path.join(args.dirPath, entry.name);
          let size = 0;
          let lastModified = new Date().toISOString();
          try {
            const stat = fs.statSync(fullPath);
            size = stat.isFile() ? stat.size : 0;
            lastModified = stat.mtime.toISOString();
          } catch { /* skip unreadable entries */ }
          return {
            name: entry.name,
            isDir: entry.isDirectory(),
            size,
            lastModified,
          };
        })
        .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist' && e.name !== 'release')
        .sort((a, b) => {
          // Folders first, then files alphabetically
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    } catch (err) {
      return [];
    }
  });

  // ═══════════════════════════════════════════
  // NATIVE DIALOG CHANNELS
  // ═══════════════════════════════════════════

  ipcMain.handle("dialog:selectFolder", async () => {
    const { dialog } = require("electron");
    const result = await dialog.showOpenDialog({
      title: "Select Folder to Watch",
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}
