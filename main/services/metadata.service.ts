/**
 * DevVault V2 — Metadata Service
 * 
 * Reads and writes project-info.json files inside user project directories.
 * This is the third and final writable file target (along with vault-config.json
 * and projects.json).
 * 
 * Safety:
 * - Only writes project-info.json — never touches any other file in user directories
 * - Uses the file-io persistence layer exclusively
 */

import * as path from "path";
import { IProjectMeta, DEFAULT_PROJECT_META } from "../models/project.model";
import { readJsonFile, writeJsonFile } from "../persistence/file-io";

/** The filename used for per-project metadata */
const META_FILENAME = "project-info.json";

/**
 * Load project metadata from a project-info.json file inside a project directory.
 * Returns default metadata if the file doesn't exist.
 * 
 * @param projectPath - Absolute path to the project root directory
 */
export async function loadProjectMeta(projectPath: string): Promise<IProjectMeta> {
  const metaPath = path.join(projectPath, META_FILENAME);
  const meta = await readJsonFile<Partial<IProjectMeta>>(metaPath);

  if (!meta) {
    return { ...DEFAULT_PROJECT_META };
  }

  // Merge with defaults to handle missing fields
  return {
    ...DEFAULT_PROJECT_META,
    ...meta,
  };
}

/**
 * Save project metadata to a project-info.json file inside a project directory.
 * Creates the file if it doesn't exist.
 * 
 * @param projectPath - Absolute path to the project root directory
 * @param meta - The metadata to save
 */
export async function saveProjectMeta(
  projectPath: string,
  meta: IProjectMeta
): Promise<void> {
  const metaPath = path.join(projectPath, META_FILENAME);
  await writeJsonFile(metaPath, meta);
}
