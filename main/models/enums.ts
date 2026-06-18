/**
 * DevVault V2 — Enumerations
 * 
 * Central enum definitions used across all services and models.
 * These represent the fixed vocabulary of the application.
 */

/** Supported technology stacks for project fingerprinting */
export enum TechStack {
  HTML_CSS_JS = "HTML/CSS/JS",
  React = "React",
  NextJS = "Next.js",
  NodeJS = "Node.js",
  Flutter = "Flutter",
  Python = "Python",
  Unity = "Unity",
  Java = "Java",
  CSharp = "C#",
  Electron = "Electron",
  Vite = "Vite",
  TypeScript = "TypeScript",
}

/** AI providers that may have been used to create a project */
export enum AIProvider {
  Gemini = "Gemini",
  ChatGPT = "ChatGPT",
  Claude = "Claude",
  Cursor = "Cursor",
  Codex = "Codex",
  Manual = "Manual",
}

/** Activity classification based on last-modified recency */
export enum ActivityCategory {
  Today = "Updated Today",
  ThisWeek = "Updated This Week",
  ThisMonth = "Updated This Month",
  Inactive = "Inactive > 30 Days",
}

/** Project status as determined by the user */
export enum ProjectStatus {
  Active = "active",
  Archived = "archived",
  Planned = "planned",
}

/** Sort fields available in the dashboard */
export enum SortField {
  Name = "name",
  LastModified = "lastModified",
  FirstDiscovered = "firstDiscovered",
  FileCount = "fileCount",
  TotalSize = "totalSize",
  Rating = "rating",
}

/** Sort direction */
export enum SortDirection {
  Asc = "asc",
  Desc = "desc",
}
