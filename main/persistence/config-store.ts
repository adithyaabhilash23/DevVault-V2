/**
 * DevVault V2 — Config Store
 * 
 * Handles reading and writing vault-config.json.
 * This is one of only two files DevVault writes to disk
 * (the other being projects.json via projects-store.ts).
 */

import * as path from "path";
import { app } from "electron";
import { readJsonFile, writeJsonFile } from "./file-io";
import { IVaultConfig, DEFAULT_CONFIG } from "../models/config.model";

/**
 * Returns the path to vault-config.json in the app's user data directory.
 */
function getConfigPath(): string {
  return path.join(app.getPath("userData"), "vault-config.json");
}

/**
 * Load the vault configuration from disk.
 * Returns the default configuration if no config file exists.
 */
export async function loadConfig(): Promise<IVaultConfig> {
  const config = await readJsonFile<IVaultConfig>(getConfigPath());
  if (!config) {
    // First launch — create default config
    await saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
  // Merge with defaults to handle missing fields from older schema versions
  return {
    ...DEFAULT_CONFIG,
    ...config,
    preferences: {
      ...DEFAULT_CONFIG.preferences,
      ...(config.preferences || {}),
    },
  };
}

/**
 * Save the vault configuration to disk.
 */
export async function saveConfig(config: IVaultConfig): Promise<void> {
  await writeJsonFile(getConfigPath(), config);
}
