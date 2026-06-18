/**
 * DevVault V2 — Tech Stack Detection Service
 * 
 * Fingerprints a project's technology stack by checking for marker files.
 * Read-only — never writes to or modifies user project directories.
 * 
 * Detection is based on the presence of specific files/directories
 * that are canonical indicators of each technology.
 */

import * as path from "path";
import { TechStack } from "../models/enums";
import { pathExists, readJsonFile } from "../persistence/file-io";

/**
 * Marker file rules for tech stack detection.
 * Each rule maps a tech stack to the files/patterns that indicate its presence.
 */
interface IDetectionRule {
  stack: TechStack;
  /** Files that, if present at project root, indicate this tech stack */
  markerFiles: string[];
  /** Optional: check package.json dependencies for these package names */
  packageDeps?: string[];
}

const DETECTION_RULES: IDetectionRule[] = [
  {
    stack: TechStack.NextJS,
    markerFiles: ["next.config.js", "next.config.ts", "next.config.mjs"],
    packageDeps: ["next"],
  },
  {
    stack: TechStack.Flutter,
    markerFiles: ["pubspec.yaml"],
  },
  {
    stack: TechStack.Unity,
    markerFiles: ["ProjectSettings"],  // Directory presence
  },
  {
    stack: TechStack.Python,
    markerFiles: ["requirements.txt", "setup.py", "pyproject.toml", "Pipfile"],
  },
  {
    stack: TechStack.Java,
    markerFiles: ["pom.xml", "build.gradle", "build.gradle.kts"],
  },
  {
    stack: TechStack.CSharp,
    markerFiles: [],  // Uses glob pattern check — see detectCSharp()
  },
  {
    stack: TechStack.React,
    markerFiles: [],
    packageDeps: ["react"],
  },
  {
    stack: TechStack.Vite,
    markerFiles: ["vite.config.js", "vite.config.ts", "vite.config.mjs"],
    packageDeps: ["vite"],
  },
  {
    stack: TechStack.Electron,
    markerFiles: [],
    packageDeps: ["electron"],
  },
  {
    stack: TechStack.TypeScript,
    markerFiles: ["tsconfig.json"],
  },
  {
    stack: TechStack.NodeJS,
    markerFiles: ["package.json"],
  },
  {
    stack: TechStack.HTML_CSS_JS,
    markerFiles: ["index.html"],
  },
];

/**
 * Detect all technology stacks present in a project directory.
 * Returns an array of detected stacks, ordered from most specific to most general.
 * 
 * @param projectPath - Absolute path to the project root directory
 * @returns Array of detected TechStack values
 */
export async function detectTechStack(projectPath: string): Promise<TechStack[]> {
  const detected: TechStack[] = [];

  // Read package.json once if it exists (used by multiple rules)
  const packageJson = await readJsonFile<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }>(path.join(projectPath, "package.json"));

  const allDeps = packageJson
    ? {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }
    : {};

  for (const rule of DETECTION_RULES) {
    // Check marker files
    for (const marker of rule.markerFiles) {
      if (await pathExists(path.join(projectPath, marker))) {
        if (!detected.includes(rule.stack)) {
          detected.push(rule.stack);
        }
        break;
      }
    }

    // Check package.json dependencies
    if (rule.packageDeps && !detected.includes(rule.stack)) {
      for (const dep of rule.packageDeps) {
        if (dep in allDeps) {
          detected.push(rule.stack);
          break;
        }
      }
    }
  }

  // Special case: C# detection via file extensions
  if (!detected.includes(TechStack.CSharp)) {
    if (await detectCSharp(projectPath)) {
      detected.push(TechStack.CSharp);
    }
  }

  return detected;
}

/**
 * C# detection — checks for .csproj or .sln files.
 */
async function detectCSharp(projectPath: string): Promise<boolean> {
  const { readDirectory } = await import("../persistence/file-io");
  const entries = await readDirectory(projectPath);
  return entries.some((e) => e.endsWith(".csproj") || e.endsWith(".sln"));
}
