/**
 * DevVault V2 — Version Family Model
 * 
 * Groups related projects that share a base name but differ by version.
 * Example: "Weather Dashboard", "Weather Dashboard 2.0", "Weather Dashboard Codex"
 */

import { IProject } from "./project.model";

/**
 * A version family groups multiple project versions together.
 */
export interface IVersionFamily {
  /** The common base name (e.g., "Weather Dashboard") */
  baseName: string;
  /** All project versions in this family, sorted by version number */
  members: IProject[];
  /** The highest detected version string, if any */
  latestVersion?: string;
  /** Total number of members in the family */
  memberCount: number;
}
