/**
 * DevVault V2 — Version Parser
 * 
 * Pure utility functions for extracting version numbers from folder names
 * and determining version family base names.
 */

/**
 * Regex patterns for version detection in folder names.
 * Ordered from most specific to least specific.
 */
const VERSION_PATTERNS: RegExp[] = [
  // "Project Name v2.1.3" or "Project Name V2.1"
  /^(.+?)\s+[vV](\d+(?:\.\d+)*)\s*$/,
  // "Project Name 2.0" (number at end with space)
  /^(.+?)\s+(\d+\.\d+(?:\.\d+)*)\s*$/,
  // "Project Name 2" (single digit version at end, only if preceded by a word)
  /^(.+?\s)\s*(\d+)\s*$/,
];

/**
 * Known version-like suffixes that indicate a variant, not a numbered version.
 * Example: "Weather Dashboard Codex" — "Codex" is a variant name.
 */
const VARIANT_SUFFIXES: ReadonlySet<string> = new Set([
  "codex", "beta", "alpha", "lite", "pro", "plus", "mini", "max",
  "legacy", "classic", "new", "old", "final", "redux",
]);

/**
 * Parse version information from a folder name.
 * 
 * @returns An object with baseName and versionNumber, or null if no version detected.
 * 
 * Examples:
 *   "Weather Dashboard 2.0"  → { baseName: "Weather Dashboard", versionNumber: "2.0" }
 *   "Weather Dashboard v3"   → { baseName: "Weather Dashboard", versionNumber: "3" }
 *   "Weather Dashboard"      → null (no version)
 *   "Weather Dashboard Codex"→ { baseName: "Weather Dashboard", versionNumber: undefined, variant: "Codex" }
 */
export function parseVersionFromFolderName(
  folderName: string
): { baseName: string; versionNumber?: string; variant?: string } | null {
  // Check for variant suffixes first
  const words = folderName.trim().split(/\s+/);
  if (words.length >= 2) {
    const lastWord = words[words.length - 1].toLowerCase();
    if (VARIANT_SUFFIXES.has(lastWord)) {
      return {
        baseName: words.slice(0, -1).join(" "),
        variant: words[words.length - 1],
      };
    }
  }

  // Try version patterns
  for (const pattern of VERSION_PATTERNS) {
    const match = folderName.match(pattern);
    if (match) {
      return {
        baseName: match[1].trim(),
        versionNumber: match[2],
      };
    }
  }

  return null;
}

/**
 * Compare two version strings numerically.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 * 
 * Examples:
 *   compareVersions("1.0", "2.0") → -1
 *   compareVersions("2.1", "2.0") → 1
 *   compareVersions("1.0.1", "1.0") → 1
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  const maxLength = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLength; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }

  return 0;
}
