/**
 * DevVault V2 — Scanner Service
 * 
 * The core engine of DevVault. Traverses watched folders, discovers projects,
 * gathers computed metadata, and merges with user metadata.
 * 
 * Safety:
 * - Read-only filesystem access (via file-io.ts)
 * - No background activity — runs only when explicitly called
 * - Async throughout — never blocks the event loop
 * 
 * Flow:
 * 1. Iterate all watched folders
 * 2. For each watched folder, read immediate children (depth 1 = project roots)
 * 3. For each project candidate, run all detection services
 * 4. Merge computed data with existing user metadata
 * 5. Classify activity category
 * 6. Return complete project list
 */

import * as path from "path";
import { BrowserWindow } from "electron";
import { IProjectComputed, IProject, IProjectMeta, DEFAULT_PROJECT_META } from "../models/project.model";
import { IWatchedFolder } from "../models/config.model";
import { readDirectoryWithTypes, getStats } from "../persistence/file-io";
import { generateProjectId, IGNORED_DIRECTORIES } from "../utils/path-helpers";
import { classifyActivity } from "../utils/date-helpers";
import { parseVersionFromFolderName } from "../utils/version-parser";
import { detectTechStack } from "./techstack.service";
import { detectGitInfo } from "./git.service";
import { detectVercelInfo } from "./vercel.service";
import { findScreenshot } from "./screenshot.service";
import { loadProjectMeta } from "./metadata.service";

/**
 * Scan all watched folders and return a complete project list.
 * Sends progress updates to the renderer via the provided BrowserWindow.
 * 
 * @param watchedFolders - Array of watched folder configurations
 * @param existingProjects - Previously known projects (for preserving firstDiscovered dates)
 * @param mainWindow - BrowserWindow for progress reporting (optional)
 */
export async function scanAllFolders(
  watchedFolders: IWatchedFolder[],
  existingProjects: IProject[],
  mainWindow?: BrowserWindow | null
): Promise<IProject[]> {
  const allProjects: IProject[] = [];
  const existingMap = new Map(existingProjects.map((p) => [p.id, p]));

  // Phase 1: Discover project candidates — immediate children of each watched folder only.
  // Subfolders inside a project (renderer/, main/, assets/) are never registered as
  // separate candidates; they are only visited by gatherFileStats during Phase 2.
  const candidates: Array<{ folderName: string; absolutePath: string; watchedFolder: string }> = [];

  for (const watched of watchedFolders) {
    const entries = await readDirectoryWithTypes(watched.path);
    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name)) {
        candidates.push({
          folderName: entry.name,
          absolutePath: path.join(watched.path, entry.name),
          watchedFolder: watched.path,
        });
      }
    }
  }

  // Phase 2: Process each project candidate
  const total = candidates.length;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];

    // Send progress update to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vault:scanProgress", {
        current: i + 1,
        total,
        folder: candidate.folderName,
      });
    }

    const project = await processProjectDirectory(candidate, existingMap);
    if (project) {
      allProjects.push(project);
    }
  }

  return allProjects;
}

/**
 * Process a single project directory: gather computed data, merge with user meta.
 */
async function processProjectDirectory(
  candidate: { folderName: string; absolutePath: string; watchedFolder: string },
  existingMap: Map<string, IProject>
): Promise<IProject | null> {
  const id = generateProjectId(candidate.absolutePath);
  const existing = existingMap.get(id);

  // Gather filesystem statistics
  const { fileCount, totalSizeBytes, lastModified } = await gatherFileStats(candidate.absolutePath);

  // If directory is empty, skip it
  if (fileCount === 0) return null;

  // Parse version info from folder name
  const versionInfo = parseVersionFromFolderName(candidate.folderName);

  // Run all detection services in parallel
  const [techStack, gitInfo, vercelInfo, screenshotPath] = await Promise.all([
    detectTechStack(candidate.absolutePath),
    detectGitInfo(candidate.absolutePath),
    detectVercelInfo(candidate.absolutePath),
    findScreenshot(candidate.absolutePath),
  ]);

  // Build computed data
  const computed: IProjectComputed = {
    id,
    folderName: candidate.folderName,
    absolutePath: candidate.absolutePath,
    parentWatchedFolder: candidate.watchedFolder,
    fileCount,
    totalSizeBytes,
    lastModified: lastModified.toISOString(),
    firstDiscovered: existing?.firstDiscovered || new Date().toISOString(),
    techStack,
    hasGit: !!gitInfo,
    gitInfo,
    hasVercel: !!vercelInfo,
    vercelInfo,
    screenshotPath,
    versionNumber: versionInfo?.versionNumber,
    familyBaseName: versionInfo?.baseName,
  };

  // Load user metadata (from project-info.json inside the project)
  const userMeta = await loadProjectMeta(candidate.absolutePath);

  // Merge existing user metadata with file-based metadata
  const meta: IProjectMeta = {
    ...DEFAULT_PROJECT_META,
    ...existing ? extractUserMeta(existing) : {},
    ...userMeta,
  };

  // Classify activity
  const activityCategory = classifyActivity(computed.lastModified);

  return {
    ...computed,
    ...meta,
    activityCategory,
  };
}

/**
 * Extract the user-editable metadata fields from an existing project.
 */
function extractUserMeta(project: IProject): Partial<IProjectMeta> {
  return {
    aiUsed: project.aiUsed,
    notes: project.notes,
    tags: project.tags,
    isFavorite: project.isFavorite,
    rating: project.rating,
    plannedPlatforms: project.plannedPlatforms,
    customStatus: project.customStatus,
  };
}

/**
 * Recursively gather file statistics for a project directory.
 * Skips ignored directories (node_modules, .git, etc.).
 */
async function gatherFileStats(
  dirPath: string,
  depth: number = 0,
  maxDepth: number = 5
): Promise<{ fileCount: number; totalSizeBytes: number; lastModified: Date }> {
  let fileCount = 0;
  let totalSizeBytes = 0;
  let lastModified = new Date(0);

  if (depth > maxDepth) {
    return { fileCount, totalSizeBytes, lastModified };
  }

  const entries = await readDirectoryWithTypes(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;

      const subStats = await gatherFileStats(fullPath, depth + 1, maxDepth);
      fileCount += subStats.fileCount;
      totalSizeBytes += subStats.totalSizeBytes;
      if (subStats.lastModified > lastModified) {
        lastModified = subStats.lastModified;
      }
    } else if (entry.isFile()) {
      fileCount++;
      const stats = await getStats(fullPath);
      if (stats) {
        totalSizeBytes += stats.size;
        if (stats.mtime > lastModified) {
          lastModified = stats.mtime;
        }
      }
    }
  }

  return { fileCount, totalSizeBytes, lastModified };
}
