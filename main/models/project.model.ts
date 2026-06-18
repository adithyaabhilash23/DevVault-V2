/**
 * DevVault V2 — Project Model
 * 
 * Defines the shape of a project throughout the system.
 * 
 * Three distinct interfaces serve three distinct purposes:
 * - IProjectComputed: What the filesystem tells us (scanner output)
 * - IProjectMeta: What the user tells us (stored in project-info.json)
 * - IProject: The merged view consumed by the renderer
 */

import { TechStack, AIProvider, ActivityCategory, ProjectStatus } from "./enums";

/**
 * Git repository information.
 * Read-only — DevVault never modifies git state.
 */
export interface IGitInfo {
  /** Current branch name (e.g., "main", "develop") */
  branch: string;
  /** Whether a remote is configured */
  hasRemote: boolean;
  /** Remote URL if available (e.g., "https://github.com/user/repo") */
  remoteUrl?: string;
  /** Whether the working tree has uncommitted changes */
  isDirty: boolean;
  /** ISO 8601 timestamp of the last commit */
  lastCommitDate?: string;
}

/**
 * Vercel deployment information.
 * Read-only — detected from .vercel/project.json presence.
 */
export interface IVercelInfo {
  /** Vercel project ID */
  projectId?: string;
  /** Vercel organization ID */
  orgId?: string;
  /** Detected framework (e.g., "nextjs", "vite") */
  framework?: string;
}

/**
 * Computed project data — derived entirely from the filesystem.
 * Produced by the scanner service during a vault refresh.
 * The user has no control over these fields.
 */
export interface IProjectComputed {
  /** SHA-256 hash of the absolute path — stable unique identifier */
  id: string;
  /** Folder name as it appears on disk (e.g., "Weather Dashboard 2.0") */
  folderName: string;
  /** Full absolute path (e.g., "D:\\Websites\\Weather Dashboard 2.0") */
  absolutePath: string;
  /** The watched folder this project was discovered under */
  parentWatchedFolder: string;
  /** Total number of files (recursive, excluding node_modules/.git) */
  fileCount: number;
  /** Total size in bytes */
  totalSizeBytes: number;
  /** ISO 8601 — most recent mtime of any file in the project */
  lastModified: string;
  /** ISO 8601 — when DevVault first discovered this project */
  firstDiscovered: string;
  /** Detected technology stacks */
  techStack: TechStack[];
  /** Whether a .git directory exists */
  hasGit: boolean;
  /** Git details if available */
  gitInfo?: IGitInfo;
  /** Whether a .vercel directory exists */
  hasVercel: boolean;
  /** Vercel details if available */
  vercelInfo?: IVercelInfo;
  /** Absolute path to a discovered preview image, or undefined */
  screenshotPath?: string;
  /** Version number parsed from folder name (e.g., "2.0") */
  versionNumber?: string;
  /** Base name without version suffix (e.g., "Weather Dashboard") */
  familyBaseName?: string;
}

/**
 * User-supplied project metadata.
 * Stored in project-info.json inside each project folder.
 * The filesystem has no say over these fields — the user is the source of truth.
 */
export interface IProjectMeta {
  /** AI tools used to create/develop this project */
  aiUsed: AIProvider[];
  /** Free-form notes (supports markdown) */
  notes: string;
  /** User-defined tags for categorization */
  tags: string[];
  /** Whether this project is marked as a favorite */
  isFavorite: boolean;
  /** User rating from 0 (unrated) to 5 */
  rating: number;
  /** Platforms the user plans to deploy to */
  plannedPlatforms: string[];
  /** User-assigned project status */
  customStatus: ProjectStatus;
}

/**
 * The complete, merged project view.
 * Combines computed filesystem data with user-supplied metadata.
 * This is what the renderer receives and displays.
 */
export interface IProject extends IProjectComputed, IProjectMeta {
  /** Computed activity category based on lastModified */
  activityCategory: ActivityCategory;
}

/**
 * Default metadata for a newly discovered project.
 * Applied when no project-info.json exists yet.
 */
export const DEFAULT_PROJECT_META: IProjectMeta = {
  aiUsed: [],
  notes: "",
  tags: [],
  isFavorite: false,
  rating: 0,
  plannedPlatforms: [],
  customStatus: ProjectStatus.Active,
};
