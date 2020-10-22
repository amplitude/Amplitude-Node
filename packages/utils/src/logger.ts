import { LogLevel } from '@amplitude/types';
import { getGlobalAmplitudeNamespace } from './misc';

// TODO: Type the global constant
const globalNamespace = getGlobalAmplitudeNamespace();

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
const logger = (globalNamespace.logger as Logger) || (globalNamespace.logger = new Logger());

export { logger };
