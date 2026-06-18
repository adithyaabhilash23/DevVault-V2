/**
 * DevVault V2 — Projects Store
 * 
 * Handles reading and writing projects.json.
 * This is one of only two files DevVault writes to disk
 * (the other being vault-config.json via config-store.ts).
 * 
 * project-info.json files inside user project folders are also written
 * by the metadata service, but through this same file-io layer.
 */

import * as path from "path";
import { app } from "electron";
import { readJsonFile, writeJsonFile } from "./file-io";
import { IProject } from "../models/project.model";

/**
 * Returns the path to projects.json in the app's user data directory.
 */
function getProjectsPath(): string {
  return path.join(app.getPath("userData"), "projects.json");
}

/**
 * Load all projects from disk.
 * Returns an empty array if no projects file exists.
 */
export async function loadProjects(): Promise<IProject[]> {
  const projects = await readJsonFile<IProject[]>(getProjectsPath());
  return projects || [];
}

/**
 * Save all projects to disk.
 */
export async function saveProjects(projects: IProject[]): Promise<void> {
  await writeJsonFile(getProjectsPath(), projects);
}
