/**
 * DevVault V2 — Date Helpers
 * 
 * Pure utility functions for date formatting and activity bucketing.
 * No side effects, no external dependencies.
 */

import { ActivityCategory } from "../models/enums";

/**
 * Classify a project's activity based on how recently it was modified.
 */
export function classifyActivity(lastModifiedISO: string): ActivityCategory {
  const lastModified = new Date(lastModifiedISO);
  const now = new Date();
  const diffMs = now.getTime() - lastModified.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (isToday(lastModified, now)) {
    return ActivityCategory.Today;
  } else if (diffDays <= 7) {
    return ActivityCategory.ThisWeek;
  } else if (diffDays <= 30) {
    return ActivityCategory.ThisMonth;
  } else {
    return ActivityCategory.Inactive;
  }
}

/**
 * Check if two dates fall on the same calendar day.
 */
function isToday(date: Date, now: Date): boolean {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Format an ISO date string to a human-readable relative time.
 * Examples: "just now", "2 hours ago", "3 days ago", "2 months ago"
 */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

/**
 * Format bytes to a human-readable size string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
