/**
 * Tracking plan
 */
export interface Plan {
  /** The tracking plan branch name e.g. "main" */
  branch?: string;
  /** The tracking plan source e.g. "web" */
  source?: string;
  /** The tracking plan version e.g. "1", "15" */
  version?: string;

  /** The event version e.g. "1.0.0". Set automatically by Ampli. */
  event_version?: string;
  /** The event uuid in the tracking plan. Set automatically by Ampli. */
  event_id?: string;
}
