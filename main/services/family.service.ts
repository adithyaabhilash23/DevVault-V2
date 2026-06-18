/**
 * DevVault V2 — Version Family Service
 * 
 * Groups projects into version families based on shared base names.
 * Example: "Weather Dashboard", "Weather Dashboard 2.0", "Weather Dashboard Codex"
 * are all members of the "Weather Dashboard" family.
 */

import { IProject } from "../models/project.model";
import { IVersionFamily } from "../models/family.model";
import { compareVersions } from "../utils/version-parser";

/**
 * Group projects into version families.
 * Only creates a family if there are 2+ members sharing a base name.
 * 
 * @param projects - All projects to analyze
 * @returns Array of version families, sorted by base name
 */
export function buildVersionFamilies(projects: IProject[]): IVersionFamily[] {
  const familyMap = new Map<string, IProject[]>();

  for (const project of projects) {
    // Use familyBaseName if the scanner detected one, otherwise use folderName
    const baseName = project.familyBaseName || project.folderName;
    const normalized = baseName.toLowerCase().trim();

    if (!familyMap.has(normalized)) {
      familyMap.set(normalized, []);
    }
    familyMap.get(normalized)!.push(project);
  }

  const families: IVersionFamily[] = [];

  for (const [, members] of familyMap) {
    // Only create a family if there are multiple members
    if (members.length < 2) continue;

    // Sort members by version number (ascending)
    members.sort((a, b) => {
      if (a.versionNumber && b.versionNumber) {
        return compareVersions(a.versionNumber, b.versionNumber);
      }
      // Projects without version numbers go last
      if (a.versionNumber && !b.versionNumber) return -1;
      if (!a.versionNumber && b.versionNumber) return 1;
      return a.folderName.localeCompare(b.folderName);
    });

    // Find the latest version
    const versioned = members.filter((m) => m.versionNumber);
    const latestVersion = versioned.length > 0
      ? versioned[versioned.length - 1].versionNumber
      : undefined;

    families.push({
      baseName: members[0].familyBaseName || members[0].folderName,
      members,
      latestVersion,
      memberCount: members.length,
    });
  }

  // Sort families alphabetically
  families.sort((a, b) => a.baseName.localeCompare(b.baseName));

  return families;
}
