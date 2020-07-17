import { LogLevel } from './logger';

/**
 * Options that you can choose to configure against the client.
 */
export interface Options {
  /**
   * Whether you opt out from sending events.
   */
  optOut?: boolean;

  /**
   * @deprecated Set it if you are using proxy server.
   */
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
}
