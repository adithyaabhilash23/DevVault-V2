/**
 * DevVault V2 — Vercel Detection Service
 *
 * Read-only detection of Vercel deployment configuration.
 * DevVault NEVER modifies Vercel state — it only reads.
 *
 * Detection priority:
 *   1. .vercel/project.json  — full project metadata available
 *   2. vercel.json           — root-level config file (no project metadata)
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
 *
 * Priority 1: .vercel/project.json — returns full IVercelInfo if found.
 * Priority 2: vercel.json at project root — returns empty IVercelInfo ({})
 *             to signal that this is a Vercel project without detailed metadata.
 * Returns undefined if neither marker is found.
 *
 * @param projectPath - Absolute path to the project root directory
 */
export async function detectVercelInfo(projectPath: string): Promise<IVercelInfo | undefined> {
  // ── Priority 1: .vercel/project.json ────────────────────────────────────
  const vercelDir = path.join(projectPath, ".vercel");

  if (await pathExists(vercelDir)) {
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

  // ── Priority 2: vercel.json at project root ──────────────────────────────
  const vercelJsonPath = path.join(projectPath, "vercel.json");

  if (await pathExists(vercelJsonPath)) {
    // vercel.json confirms this is a Vercel project;
    // no project ID or org metadata is available from this file.
    return {};
  }

  // Neither marker found — not a Vercel project
  return undefined;
}
