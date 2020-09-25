import { Client, Event, Options, Status, Response, RetryClass } from '@amplitude/types';
import { logger } from '@amplitude/utils';
import { SDK_NAME, SDK_VERSION, DEFAULT_OPTIONS } from './constants';
import { RetryHandler } from './retryHandler';

export class NodeClient implements Client<Options> {
  /** Project Api Key */
  protected readonly _apiKey: string;

  /** Options for the client. */
  protected readonly _options: Options;

  private _events: Array<Event> = [];
  private _transportWithRetry: RetryClass;
  private _flushTimer: NodeJS.Timeout | null = null;

  /**
   * Initializes this client instance.
   *
   * @param apiKey API key for your project
   * @param options options for the client
   */
  public constructor(apiKey: string, options: Partial<Options> = {}) {
    this._apiKey = apiKey;
    this._options = Object.assign({}, DEFAULT_OPTIONS, options);
    this._transportWithRetry = this._options.retryClass || this._setupDefaultTransport();
    this._setUpLogging();
  }

  /**
   * @inheritDoc
   */
  public getOptions(): Options {
    return this._options;
  }

  /**
   * @inheritDoc
   */
  public async flush(): Promise<Response> {
    // Clear the timeout
    if (this._flushTimer !== null) {
      clearTimeout(this._flushTimer);
    }

    // Check if there's 0 events, flush is not needed.
    const arrayLength = this._events.length;
    if (arrayLength === 0) {
      return { status: Status.Success, statusCode: 200 };
    }
    const eventsToSend = this._events.splice(0, arrayLength);
    return this._transportWithRetry.sendEventsWithRetry(eventsToSend);
  }

  /**
   * @inheritDoc
   */
  public logEvent(event: Event): void {
    if (this._options.optOut === true) {
      return;
    }

    this._annotateEvent(event);
    // Add event to unsent events queue.
    this._events.push(event);

    const shouldFlushImmediately = !this._options.batch || this._events.length >= this._options.maxCachedEvents;

    if (shouldFlushImmediately) {
      // # of events exceeds the limit, flush them.
      this.flush();
    } else {
      // Not ready to flush them and not timing yet, then set the timeout
      if (this._flushTimer === null) {
        this._flushTimer = setTimeout(() => {
          this.flush();
        }, this._options.uploadIntervalInSec * 1000);
      }
    }
  }

  /** Add platform dependent field onto event. */
  private _annotateEvent(event: Event): void {
    event.library = `${SDK_NAME}/${SDK_VERSION}`;
    event.platform = 'Node.js';
  }

  private _setupDefaultTransport(): RetryHandler {
    return new RetryHandler(this._apiKey, this._options);
  }

  private _setUpLogging(): void {
    if (this._options.debug || this._options.logLevel) {
      if (this._options.logLevel) {
        logger.enable(this._options.logLevel);
      } else {
        logger.enable();
      }
    }
  }
}
