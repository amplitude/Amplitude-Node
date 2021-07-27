import { LogLevel } from './logger';
import { Transport } from './transport';
import { Retry } from './retry';
import { Response } from './response';

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

  /**
   * The maximum number of times a server will attempt to retry
   * @deprecated Please use retryTimeouts. It will be converted to retryTimeouts with exponential wait times (e.g. 100ms -> 200ms -> 400ms -> ...)'
   */
  maxRetries?: number;

  /**
   * Determines # of retries for sending failed events and how long each retry to wait for (ms)
   * An empty array means no retries
   */
  retryTimeouts: number[];

  /**
   * Whether you opt out from sending events.
   */
  optOut: boolean;

  /**
   * The class being used to handle event retrying.
   */
  retryClass: Retry | null;

  /**
   * The class being used to transport events.
   */
  transportClass: Transport | null;

  /** If you're using a proxy server, set its url here. */
  serverUrl: string;

  /** The events upload interval */
  uploadIntervalInSec: number;

  /**
   * Optional parameter allowing users to set minimum permitted length for user_id & device_id fields
   * As described here: https://developers.amplitude.com/docs/http-api-v2#schemaRequestOptions
   */
  minIdLength?: number | null;

  /**
   * Lifecycle callback that is executed after a retry attempt. Called in {@link Retry.sendEventsWithRetry}
   *
   * @param response Response from the given retry attempt
   * @param attemptNumber Index in retryTimeouts for how long Amplitude waited before this retry attempt. Starts at 0.
   * @param isLastRetry True if attemptNumber === retryTimeouts.length - 1
   */
  onRetry: ((response: Response, attemptNumber: number, isLastRetry: boolean) => boolean) | null;
}
