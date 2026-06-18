/**
 * DevVault V2 — Path Helpers
 * 
 * Pure utility functions for path normalization and safe operations.
 * No side effects, no filesystem access.
 */

import * as path from "path";
import * as crypto from "crypto";

/**
 * Generate a stable, unique ID for a project based on its absolute path.
 * Uses SHA-256 so the same path always produces the same ID.
 */
export function generateProjectId(absolutePath: string): string {
  const normalized = path.normalize(absolutePath).toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex").substring(0, 16);
}

/**
 * Normalize a path for consistent comparison.
 * Resolves ../ and ./ segments, normalizes separators.
 */
export function normalizePath(inputPath: string): string {
  return path.resolve(inputPath);
}

/**
 * Check if a given path is a child of a parent directory.
 * Used to verify that a project folder is inside a watched folder.
 */
export function isChildOf(childPath: string, parentPath: string): boolean {
  const normalizedChild = path.resolve(childPath);
  const normalizedParent = path.resolve(parentPath);
  return normalizedChild.startsWith(normalizedParent + path.sep);
}

/**
 * Directories to always skip during scanning.
 * These are never valid project folders.
 */
export const IGNORED_DIRECTORIES: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
  ".vscode",
  ".idea",
  "__pycache__",
  ".next",
  "dist",
  "build",
  ".vercel",
  ".dart_tool",
  ".pub-cache",
  "Library",  // Unity internal
  "Temp",     // Unity internal
]);
