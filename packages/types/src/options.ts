import { LogLevel } from './logger';

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

  /**
   * Configuration of the logging verbosity of the SDK.
   * 0 = NONE: No Logs will be surfaced.
   * 1 = ERROR: SDK internal errors will be generated.
   * 2 = WARN: Warnings will be generated around dangerous/deprecated features.
   * 3 = VERBOSE: All SDK actions will be logged.
   */
  logLevel?: LogLevel;

  /**
   * Whether or not the SDK should be started in debug mode.
   * This will enable the SDK to generate logs at WARN level or above, if the
   * logLevel is not specified.
   */
  debug?: boolean;

  /** The maximum number of times a server will attempt to retry  */
  maxRetries?: number;
}
