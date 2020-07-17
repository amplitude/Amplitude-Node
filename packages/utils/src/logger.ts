import { LogLevel } from '@amplitude/types';
import { getGlobalObject } from './misc';

// TODO: Type the global constant
const global = getGlobalObject();

/** Prefix for logging strings */
const PREFIX = 'Amplitude Logger ';

/** JSDoc */
class Logger {
  /** JSDoc */
  private _logLevel: LogLevel;

  /** JSDoc */
  public constructor() {
    this._logLevel = LogLevel.NONE;
  }

  /** JSDoc */
  public disable(): void {
    this._logLevel = 0;
  }

  /** JSDoc */
  public enable(logLevel: LogLevel = LogLevel.WARN): void {
    this._logLevel = logLevel;
  }

  /** JSDoc */
  public log(...args: any[]): void {
    if (!this._logLevel <= LogLevel.VERBOSE) {
      return;
    }
    global.console.log(`${PREFIX}[Log]: ${args.join(' ')}`); // tslint:disable-line:no-console
  }

  /** JSDoc */
  public warn(...args: any[]): void {
    if (!this._logLevel <= LogLevel.WARN) {
      return;
    }
    global.console.warn(`${PREFIX}[Warn]: ${args.join(' ')}`); // tslint:disable-line:no-console
  }

  /** JSDoc */
  public error(...args: any[]): void {
    if (!this._logLevel <= LogLevel.ERROR) {
      return;
    }
    global.console.error(`${PREFIX}[Error]: ${args.join(' ')}`); // tslint:disable-line:no-console
  }
}

// Ensure we only have a single logger instance, even if multiple versions of @sentry/utils are being used
global.__AMPLITUDE__ = global.__AMPLITUDE__ || {};
const logger = (global.__AMPLITUDE__.logger as Logger) || (global.__AMPLITUDE__.logger = new Logger());

export { logger };
