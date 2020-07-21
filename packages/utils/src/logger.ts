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
    this._logLevel = 0;
  }

  /** JSDoc */
  public disable(): void {
    this._logLevel = 0;
  }

  /** JSDoc */
  public enable(logLevel: LogLevel = LogLevel.Warn): void {
    this._logLevel = logLevel;
  }

  /** JSDoc */
  public log(...args: any[]): void {
    if (this._logLevel < LogLevel.Verbose) {
      return;
    }
    global.console.log(`${PREFIX}[Log]: ${args.join(' ')}`); // tslint:disable-line:no-console
  }

  /** JSDoc */
  public warn(...args: any[]): void {
    if (this._logLevel < LogLevel.Warn) {
      return;
    }
    global.console.warn(`${PREFIX}[Warn]: ${args.join(' ')}`); // tslint:disable-line:no-console
  }

  /** JSDoc */
  public error(...args: any[]): void {
    if (this._logLevel < LogLevel.Error) {
      return;
    }
    global.console.error(`${PREFIX}[Error]: ${args.join(' ')}`); // tslint:disable-line:no-console
  }
}

// Ensure we only have a single logger instance, even if multiple versions of @amplitude/utils are being used
global.__AMPLITUDE__ = global.__AMPLITUDE__ || {};
const logger = (global.__AMPLITUDE__.logger as Logger) || (global.__AMPLITUDE__.logger = new Logger());

export { logger };
