/**
 * Tracking plan
 * @property {string} [plan.branch] The tracking plan branch name e.g. "main"
 * @property {string} [plan.source] The tracking plan source e.g. "web"
 * @property {string} [plan.version] The tracking plan version e.g. "1", "15"
 */
export interface Plan {
  branch?: string;
  source?: string;
  version?: string;
}
