/**
 * DevVault V2 — Activity Classification Service
 * 
 * Buckets projects into activity categories based on their last-modified date.
 * Pure computation — no I/O.
 */

import { IProject } from "../models/project.model";
import { ActivityCategory } from "../models/enums";

/**
 * Result of activity classification — projects grouped by recency.
 */
export interface IActivityBuckets {
  [ActivityCategory.Today]: IProject[];
  [ActivityCategory.ThisWeek]: IProject[];
  [ActivityCategory.ThisMonth]: IProject[];
  [ActivityCategory.Inactive]: IProject[];
}

/**
 * Group projects by their activity category.
 * 
 * @param projects - All projects to classify
 * @returns Projects bucketed by activity recency
 */
export function classifyProjects(projects: IProject[]): IActivityBuckets {
  const buckets: IActivityBuckets = {
    [ActivityCategory.Today]: [],
    [ActivityCategory.ThisWeek]: [],
    [ActivityCategory.ThisMonth]: [],
    [ActivityCategory.Inactive]: [],
  };

  for (const project of projects) {
    buckets[project.activityCategory].push(project);
  }

  return buckets;
}

/**
 * Get activity summary statistics.
 */
export function getActivitySummary(projects: IProject[]): Record<ActivityCategory, number> {
  const buckets = classifyProjects(projects);
  return {
    [ActivityCategory.Today]: buckets[ActivityCategory.Today].length,
    [ActivityCategory.ThisWeek]: buckets[ActivityCategory.ThisWeek].length,
    [ActivityCategory.ThisMonth]: buckets[ActivityCategory.ThisMonth].length,
    [ActivityCategory.Inactive]: buckets[ActivityCategory.Inactive].length,
  };
}
