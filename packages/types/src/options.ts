import { LogLevel } from './logger';
import { Transport } from './transport';
import { RetryClass } from './retry';

/**
 * Options that you can choose to configure against the client.
 */
export interface Options {
  /**
   * Whether or not the SDK should be started in debug mode.
   * This will enable the SDK to generate logs at WARN level or above, if the
   * logLevel is not specified.
   */
  debug: boolean;

  /**
   * Configuration of the logging verbosity of the SDK.
   * 0 = NONE: No Logs will be surfaced.
   * 1 = ERROR: SDK internal errors will be generated.
   * 2 = WARN: Warnings will be generated around dangerous/deprecated features.
   * 3 = VERBOSE: All SDK actions will be logged.
   */
  logLevel: LogLevel;

  /** The maximum events in the buffer */
  maxCachedEvents: number;

  /** The maximum number of times a server will attempt to retry sending events after failiure */
  maxRetries: number;

  /**
   * Base milliseconds failed events sending should wait until retrying.
   * Each subsequent failed event sending will current the wait time by 2.
   * (Example: 100ms -> 200ms -> 400ms -> 800ms -> ...)
   */
  baseRetryTimeout: number;

  /**
   * Whether you opt out from sending events.
   */
  optOut: boolean;

  /**
   * The class being used to handle event retrying.
   */
  retryClass: RetryClass | null;

  /**
   * The class being used to transport events.
   */
  transportClass: Transport | null;

  /** If you're using a proxy server, set its url here. */
  serverUrl: string;

  /** The events upload interval */
  uploadIntervalInSec: number;
}
