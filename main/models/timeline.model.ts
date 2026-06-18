/**
 * DevVault V2 — Timeline Model
 * 
 * Represents chronological events in the project timeline view.
 */

/**
 * Types of events that appear in the timeline.
 */
export type TimelineEventType = "discovered" | "modified" | "created";

/**
 * A single timeline event.
 */
export interface ITimelineEvent {
  /** ISO 8601 date of the event */
  date: string;
  /** What kind of event this represents */
  type: TimelineEventType;
  /** ID of the associated project */
  projectId: string;
  /** Display name of the project */
  projectName: string;
  /** Human-readable event description */
  description: string;
}
