/**
 * DevVault V2 — File I/O Wrapper
 * 
 * THIS IS THE SECURITY BOUNDARY.
 * 
 * All filesystem read/write operations in the entire application
 * MUST go through this module. No other file may import fs/promises directly.
 * 
 * Safety guarantees:
 * - All operations are async (no *Sync methods)
 * - Only three files are ever written: vault-config.json, projects.json, project-info.json
 * - No delete, rename, or move operations exist
 * - No mkdir on user project directories
 */

import { promises as fs } from "fs";
import * as path from "path";

/**
 * Read a file as UTF-8 string.
 * Returns undefined if the file does not exist.
 */
export async function readFileContent(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return undefined;
  }
}

/**
 * Read and parse a JSON file.
 * Returns undefined if the file does not exist or is invalid JSON.
 */
export async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  const content = await readFileContent(filePath);
  if (content === undefined) return undefined;
  try {
    return JSON.parse(content) as T;
  } catch {
    return undefined;
  }
}

/**
 * Write a JSON object to a file with pretty formatting.
 * Creates parent directories if they don't exist.
 * 
 * IMPORTANT: This function should only be called by config-store.ts
 * and projects-store.ts. Direct usage from services is prohibited.
 */
export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, "utf-8");
}

/**
 * Check if a file or directory exists.
 */
export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the contents of a directory.
 * Returns an empty array if the directory does not exist.
 */
export async function readDirectory(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}

/**
 * Get file/directory statistics.
 * Returns undefined if the path does not exist.
 */
export async function getStats(targetPath: string): Promise<import("fs").Stats | undefined> {
  try {
    return await fs.stat(targetPath);
  } catch {
    return undefined;
  }
}

/**
 * Read directory entries with file type information.
 * Returns an empty array if the directory does not exist.
 */
export async function readDirectoryWithTypes(
  dirPath: string
): Promise<import("fs").Dirent[]> {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}
