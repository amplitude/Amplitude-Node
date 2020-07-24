/**
 * Options that you can choose to configure against the client.
 */
export interface Options {
  /**
   * Whether you opt out from sending events.
   */
  optOut?: boolean;

  /** The maximum events in the buffer */
  maxCachedEvents?: number;

  /** The events upload interval */
  uploadIntervalInSec?: number;

  /** If you're using a proxy server, set its url here. */
  serverUrl?: string;
}
