/**
 * DevVault V2 — Config Service
 * 
 * Business logic layer for vault configuration management.
 * Handles adding/removing watched folders and updating preferences.
 * Delegates persistence to config-store.ts.
 */

import { IVaultConfig, IWatchedFolder } from "../models/config.model";
import { loadConfig, saveConfig } from "../persistence/config-store";
import { normalizePath } from "../utils/path-helpers";
import { pathExists } from "../persistence/file-io";

/**
 * Get the current vault configuration.
 */
export async function getConfig(): Promise<IVaultConfig> {
  return await loadConfig();
}

/**
 * Add a new watched folder to the configuration.
 * Validates that the path exists and is not already watched.
 * 
 * @throws Error if the path doesn't exist or is already watched
 */
export async function addWatchedFolder(folderPath: string, label?: string): Promise<IVaultConfig> {
  const normalized = normalizePath(folderPath);

  // Validate the path exists
  if (!(await pathExists(normalized))) {
    throw new Error(`Folder does not exist: ${normalized}`);
  }

  const config = await loadConfig();

  // Check for duplicates
  const isDuplicate = config.watchedFolders.some(
    (wf) => normalizePath(wf.path) === normalized
  );
  if (isDuplicate) {
    throw new Error(`Folder is already watched: ${normalized}`);
  }

  const newFolder: IWatchedFolder = {
    path: normalized,
    label,
    addedAt: new Date().toISOString(),
  };

  config.watchedFolders.push(newFolder);
  await saveConfig(config);
  return config;
}

/**
 * Remove a watched folder from the configuration.
 * This does NOT delete the folder — it only stops watching it.
 */
export async function removeWatchedFolder(folderPath: string): Promise<IVaultConfig> {
  const normalized = normalizePath(folderPath);
  const config = await loadConfig();

  config.watchedFolders = config.watchedFolders.filter(
    (wf) => normalizePath(wf.path) !== normalized
  );

  await saveConfig(config);
  return config;
}

/**
 * Update user preferences.
 */
export async function updatePreferences(
  updates: Partial<IVaultConfig["preferences"]>
): Promise<IVaultConfig> {
  const config = await loadConfig();
  config.preferences = {
    ...config.preferences,
    ...updates,
  };
  await saveConfig(config);
  return config;
}

/**
 * Record a completed scan timestamp.
 */
export async function recordScanTimestamp(): Promise<void> {
  const config = await loadConfig();
  config.lastScanTimestamp = new Date().toISOString();
  await saveConfig(config);
}
