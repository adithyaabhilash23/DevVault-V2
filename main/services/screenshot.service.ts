/**
 * DevVault V2 — Screenshot Discovery Service
 * 
 * Searches for preview images inside project directories.
 * Read-only — never creates or modifies images.
 * 
 * Searches for these filenames (case-insensitive):
 * - preview.png / preview.jpg / preview.webp
 * - screenshot.png / screenshot.jpg / screenshot.webp
 * - thumbnail.png / thumbnail.jpg / thumbnail.webp
 */

import * as path from "path";
import { pathExists } from "../persistence/file-io";

/**
 * Candidate filenames for screenshot discovery, ordered by priority.
 */
const SCREENSHOT_CANDIDATES: string[] = [
  "preview.png",
  "preview.jpg",
  "preview.webp",
  "screenshot.png",
  "screenshot.jpg",
  "screenshot.webp",
  "thumbnail.png",
  "thumbnail.jpg",
  "thumbnail.webp",
];

/**
 * Find a preview screenshot image in a project directory.
 * Returns the absolute path to the first matching image, or undefined.
 * 
 * @param projectPath - Absolute path to the project root directory
 */
export async function findScreenshot(projectPath: string): Promise<string | undefined> {
  for (const filename of SCREENSHOT_CANDIDATES) {
    const fullPath = path.join(projectPath, filename);
    if (await pathExists(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}
