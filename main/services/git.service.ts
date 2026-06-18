/**
 * DevVault V2 — Git Detection Service
 * 
 * Read-only detection of Git repository status.
 * DevVault NEVER modifies git state — it only reads.
 * 
 * Detection method:
 * 1. Check for .git/ directory existence
 * 2. Read .git/HEAD for current branch
 * 3. Read .git/config for remote URL
 * 4. Check for uncommitted changes via git status (child_process)
 */

import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { IGitInfo } from "../models/project.model";
import { pathExists, readFileContent } from "../persistence/file-io";

const execFileAsync = promisify(execFile);

/**
 * Detect Git repository information for a project.
 * Returns undefined if the project is not a git repository.
 * 
 * @param projectPath - Absolute path to the project root directory
 */
export async function detectGitInfo(projectPath: string): Promise<IGitInfo | undefined> {
  const gitDir = path.join(projectPath, ".git");

  if (!(await pathExists(gitDir))) {
    return undefined;
  }

  const branch = await detectBranch(gitDir);
  const remote = await detectRemote(projectPath);
  const isDirty = await detectDirtyState(projectPath);
  const lastCommitDate = await detectLastCommitDate(projectPath);

  return {
    branch: branch || "unknown",
    hasRemote: !!remote,
    remoteUrl: remote,
    isDirty,
    lastCommitDate,
  };
}

/**
 * Read the current branch from .git/HEAD.
 */
async function detectBranch(gitDir: string): Promise<string | undefined> {
  const headContent = await readFileContent(path.join(gitDir, "HEAD"));
  if (!headContent) return undefined;

  // HEAD file contains "ref: refs/heads/main\n" when on a branch
  const match = headContent.trim().match(/^ref: refs\/heads\/(.+)$/);
  return match ? match[1] : "detached";
}

/**
 * Get the remote origin URL using git command.
 */
async function detectRemote(projectPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["remote", "get-url", "origin"], {
      cwd: projectPath,
      timeout: 5000,
    });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Check if the working tree has uncommitted changes.
 */
async function detectDirtyState(projectPath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
      cwd: projectPath,
      timeout: 5000,
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the date of the last commit.
 */
async function detectLastCommitDate(projectPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "-1", "--format=%aI"],
      { cwd: projectPath, timeout: 5000 }
    );
    const dateStr = stdout.trim();
    return dateStr || undefined;
  } catch {
    return undefined;
  }
}
