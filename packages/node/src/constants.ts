import { Options, LogLevel } from '@amplitude/types';
export const SDK_NAME = 'amplitude-node';
export const SDK_VERSION = '0.3.3';
export const AMPLITUDE_SERVER_URL = 'https://api2.amplitude.com/2/httpapi';
export const DEFAULT_OPTIONS: Options = {
  debug: false,
  maxCachedEvents: 100,
  maxRetries: 10,
  logLevel: LogLevel.None,
  optOut: false,
  serverUrl: AMPLITUDE_SERVER_URL,
  /** By default, events flush on the next event loop*/
  uploadIntervalInSec: 0,
};
