/**
 * DevVault V2 — Configuration Model
 * 
 * Defines the shape of vault-config.json and related structures.
 * This file represents the user's preferences and watched folder list.
 */

import { SortField, SortDirection } from "./enums";

/**
 * A single watched folder entry.
 * The user adds these to tell DevVault where to look for projects.
 */
export interface IWatchedFolder {
  /** Absolute path to the watched directory (e.g., "D:\\Websites") */
  path: string;
  /** User-friendly label (e.g., "Web Projects") — optional */
  label?: string;
  /** ISO 8601 timestamp of when this folder was added */
  addedAt: string;
}

/**
 * User preferences for the application.
 */
export interface IPreferences {
  /** UI theme */
  theme: "dark" | "light";
  /** Default project display mode */
  defaultView: "grid" | "list";
  /** Default sort field */
  defaultSort: SortField;
  /** Default sort direction */
  defaultSortDirection: SortDirection;
  /** Maximum recursion depth for project scanning (default: 3) */
  scanDepth: number;
}

/**
 * Root configuration object — persisted as vault-config.json.
 * Schema version is included for future-proof migrations.
 */
export interface IVaultConfig {
  /** Schema version for data migrations (increment on breaking changes) */
  version: number;
  /** List of directories DevVault watches for projects */
  watchedFolders: IWatchedFolder[];
  /** User preferences */
  preferences: IPreferences;
  /** ISO 8601 timestamp of the last completed scan */
  lastScanTimestamp?: string;
}

/**
 * Default configuration for a fresh DevVault installation.
 */
export const DEFAULT_CONFIG: IVaultConfig = {
  version: 1,
  watchedFolders: [],
  preferences: {
    theme: "dark",
    defaultView: "grid",
    defaultSort: SortField.LastModified,
    defaultSortDirection: SortDirection.Desc,
    scanDepth: 3,
  },
};
