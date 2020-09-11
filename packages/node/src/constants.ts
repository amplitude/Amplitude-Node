import { Options, LogLevel } from '@amplitude/types';
export const SDK_NAME = 'amplitude-node';
export const SDK_VERSION = '0.3.3';
export const AMPLITUDE_SERVER_URL = 'https://api2.amplitude.com/2/httpapi';
export const BASE_RETRY_TIMEOUT = 100;
export const DEFAULT_OPTIONS: Options = {
  serverUrl: AMPLITUDE_SERVER_URL,
  debug: false,
  // 2kb is a safe estimate for a medium size event object. This keeps the SDK's memory footprint roughly
  // under 32 MB.
  maxCachedEvents: 16000,
  maxRetries: 10,
  logLevel: LogLevel.None,
  optOut: false,
  // The client will instantiate the retry/transport classes if not defined
  retryClass: null,
  transportClass: null,
  // By default, events flush on the next event loop
  uploadIntervalInSec: 0,
};
