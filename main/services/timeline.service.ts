/**
 * DevVault V2 — Timeline Service
 * 
 * Builds a chronological timeline of project events.
 * Pure computation — reads from project data, produces timeline events.
 */

import { IProject } from "../models/project.model";
import { ITimelineEvent } from "../models/timeline.model";

/**
 * Build a chronological timeline from project data.
 * Creates events for project discovery and most recent modification.
 * 
 * @param projects - All projects to include in the timeline
 * @returns Array of timeline events, sorted newest-first
 */
export function buildTimeline(projects: IProject[]): ITimelineEvent[] {
  const events: ITimelineEvent[] = [];

  for (const project of projects) {
    // Discovery event
    events.push({
      date: project.firstDiscovered,
      type: "discovered",
      projectId: project.id,
      projectName: project.folderName,
      description: `Discovered "${project.folderName}" in ${project.parentWatchedFolder}`,
    });

    // Last modification event (only if different from discovery)
    if (project.lastModified !== project.firstDiscovered) {
      events.push({
        date: project.lastModified,
        type: "modified",
        projectId: project.id,
        projectName: project.folderName,
        description: `"${project.folderName}" was modified`,
      });
    }
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return events;
}
