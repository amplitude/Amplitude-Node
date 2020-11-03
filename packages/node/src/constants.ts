import { Options, LogLevel } from '@amplitude/types';
export { version as SDK_VERSION } from '../package.json';
export const SDK_NAME = 'amplitude-node';
export const AMPLITUDE_SERVER_URL = 'https://api2.amplitude.com/2/httpapi';
export const BASE_RETRY_TIMEOUT_MS = 100;
// The overridable constants of the node SDK
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
  retry: ()
};
