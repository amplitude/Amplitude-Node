import { NodeOptions, LogLevel, Response, Status } from '@amplitude/types';
export const SDK_NAME = 'amplitude-node';
export const SDK_VERSION = '0.3.3';
export const AMPLITUDE_SERVER_URL = 'https://api2.amplitude.com/2/httpapi';
export const BASE_RETRY_TIMEOUT = 100;
export const DEFAULT_OPTIONS: NodeOptions = {
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

// A success response sent when the SDK didn't need to actually do anything
// But also successfully returned.
export const NOOP_SUCCESS_RESPONSE: Response = {
  statusCode: 200,
  status: Status.Success,
  body: {
    code: 200,
    eventsIngested: 0,
    payloadSizeBytes: 0,
    serverUploadTime: 0,
  },
};
