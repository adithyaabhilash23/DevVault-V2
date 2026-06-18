/**
 * DevVault V2 — Export/Import Service
 * 
 * Handles full vault state backup and restore.
 * Exports user metadata and config to a portable JSON file.
 * 
 * Safety:
 * - Export reads existing data only
 * - Import overwrites DevVault's own data files, never user project files
 */

import { dialog } from "electron";
import { IProject } from "../models/project.model";
import { IVaultConfig } from "../models/config.model";
import { readFileContent, writeJsonFile } from "../persistence/file-io";

/**
 * Shape of an exported backup file.
 */
export interface IVaultBackup {
  /** Backup format version */
  formatVersion: number;
  /** ISO 8601 timestamp of when the backup was created */
  exportedAt: string;
  /** The vault configuration at time of export */
  config: IVaultConfig;
  /** All projects at time of export */
  projects: IProject[];
}

/**
 * Export the full vault state to a user-chosen JSON file.
 * Opens a native save dialog.
 * 
 * @returns The path where the backup was saved, or undefined if cancelled
 */
export async function exportBackup(
  config: IVaultConfig,
  projects: IProject[]
): Promise<string | undefined> {
  const result = await dialog.showSaveDialog({
    title: "Export Vault Backup",
    defaultPath: `devvault-backup-${new Date().toISOString().split("T")[0]}.json`,
    filters: [{ name: "JSON Files", extensions: ["json"] }],
  });

  if (result.canceled || !result.filePath) {
    return undefined;
  }

  const backup: IVaultBackup = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    config,
    projects,
  };

  await writeJsonFile(result.filePath, backup);
  return result.filePath;
}

/**
 * Import a vault backup from a user-chosen JSON file.
 * Opens a native open dialog.
 * 
 * @returns The parsed backup data, or undefined if cancelled or invalid
 */
export async function importBackup(): Promise<IVaultBackup | undefined> {
  const result = await dialog.showOpenDialog({
    title: "Import Vault Backup",
    filters: [{ name: "JSON Files", extensions: ["json"] }],
    properties: ["openFile"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return undefined;
  }

  const content = await readFileContent(result.filePaths[0]);
  if (!content) return undefined;

  try {
    const backup = JSON.parse(content) as IVaultBackup;

    // Basic validation
    if (!backup.formatVersion || !backup.config || !Array.isArray(backup.projects)) {
      throw new Error("Invalid backup format");
    }

    return backup;
  } catch {
    return undefined;
  }
}
