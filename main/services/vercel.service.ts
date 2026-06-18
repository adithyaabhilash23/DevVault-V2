/**
 * DevVault V2 — Vercel Detection Service
 * 
 * Read-only detection of Vercel deployment configuration.
 * DevVault NEVER modifies Vercel state — it only reads.
 * 
 * Detection method:
 * Check for .vercel/project.json and read its contents.
 */

import * as path from "path";
import { IVercelInfo } from "../models/project.model";
import { pathExists, readJsonFile } from "../persistence/file-io";

/**
 * Shape of the .vercel/project.json file.
 */
interface IVercelProjectJson {
  projectId?: string;
  orgId?: string;
  settings?: {
    framework?: string;
  };
}

/**
 * Detect Vercel deployment information for a project.
 * Returns undefined if no .vercel directory exists.
 * 
 * @param projectPath - Absolute path to the project root directory
 */
export async function detectVercelInfo(projectPath: string): Promise<IVercelInfo | undefined> {
  const vercelDir = path.join(projectPath, ".vercel");

  if (!(await pathExists(vercelDir))) {
    return undefined;
  }

  const projectJson = await readJsonFile<IVercelProjectJson>(
    path.join(vercelDir, "project.json")
  );

  if (!projectJson) {
    // .vercel directory exists but no readable project.json
    return {};
  }

  return {
    projectId: projectJson.projectId,
    orgId: projectJson.orgId,
    framework: projectJson.settings?.framework,
  };
}
