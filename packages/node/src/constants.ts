import { Options, LogLevel } from '@amplitude/types';
// constants related to this instance of the SDK
export { version as SDK_VERSION } from '../package.json';
export const SDK_NAME = 'amplitude-node';

export const AMPLITUDE_API_HOST = 'api.amplitude.com';
export const AMPLITUDE_API_PATH = '/2/httpapi';
export const DEFAULT_OPTIONS: Options = {
  optOut: false,
  serverUrl: AMPLITUDE_API_HOST,
  logLevel: LogLevel.None,
  debug: false,
};
