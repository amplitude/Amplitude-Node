import { Client, Event, Options, Response, RetryClass, SKIPPED_RESPONSE } from '@amplitude/types';
import { logger } from '@amplitude/utils';
import { RetryHandler } from './retryHandler';
import { SDK_NAME, SDK_VERSION, DEFAULT_OPTIONS } from './constants';

export class NodeClient implements Client<Options> {
  /** Project Api Key */
  protected readonly _apiKey: string;

  /** Options for the client. */
  protected readonly _options: Options;

  private _events: Event[] = [];
  private _responseListeners: Array<{ resolve: (response: Response) => void; reject: (err: Error) => void }> = [];
  private readonly _transportWithRetry: RetryClass;
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
    this._setUpLogging();
    this._transportWithRetry = this._options.retryClass ?? this._setupDefaultTransport();
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
      this._flushTimer = null;
    }

    // Check if there's 0 events, flush is not needed.
    if (this._events.length === 0) {
      return SKIPPED_RESPONSE;
    }

    // Reset the events + response listeners and pull them out.
    const responseListeners = this._responseListeners;
    this._responseListeners = [];
    const eventsToSend = this._events;
    this._events = [];

    try {
      const response = await this._transportWithRetry.sendEventsWithRetry(eventsToSend);
      responseListeners.forEach(({ resolve }) => resolve(response));
      return response;
    } catch (err) {
      responseListeners.forEach(({ reject }) => reject(err));
      throw err;
    }
  }

  /**
   * @inheritDoc
   */
  public async logEvent(event: Event): Promise<Response> {
    if (this._options.optOut) {
      return await Promise.resolve(SKIPPED_RESPONSE);
    }

    this._annotateEvent(event);

    return await new Promise((resolve, reject) => {
      // Add event to unsent events queue.
      this._events.push(event);
      this._responseListeners.push({ resolve, reject });
      if (this._events.length >= this._options.maxCachedEvents) {
        // # of events exceeds the limit, flush them.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.flush();
      } else {
        // Not ready to flush them and not timing yet, then set the timeout
        if (this._flushTimer === null) {
          this._flushTimer = setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.flush();
          }, this._options.uploadIntervalInSec * 1000);
        }
      }
    });
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
    if (this._options.debug || this._options.logLevel > 0) {
      if (this._options.logLevel > 0) {
        logger.enable(this._options.logLevel);
      } else {
        logger.enable();
      }
    }
  }
}
