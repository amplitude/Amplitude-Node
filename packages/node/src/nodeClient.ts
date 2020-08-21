import { Client, Event, Options, Status } from '@amplitude/types';
import { SDK_NAME, SDK_VERSION } from './constants';
import { logger } from '@amplitude/utils';
import { RetryHandler } from './retryHandler';

export class NodeClient implements Client<Options> {
  /** Project Api Key */
  protected readonly _apiKey: string;

  /** Options for the client. */
  protected readonly _options: Options;

  private _events: Event[];
  private _transport: RetryHandler;
  private _flushTimer: number = 0;

  /**
   * Initializes this client instance.
   *
   * @param apiKey API key for your project
   * @param options options for the client
   */
  public constructor(apiKey: string, options: Options = {}) {
    this._apiKey = apiKey;
    this._options = options;
    this._events = [];
    this._transport = this._setupTransport();
    if (options.debug || options.logLevel) {
      logger.enable(options.logLevel);
    }
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
    clearTimeout(this._flushTimer);

    // If there's an upload currently in progress, wait for it to finish first.

    // Check if there's 0 events, flush is not needed.
    const arrayLength = this._events.length;
    if (arrayLength === 0) {
      return { status: Status.Success, statusCode: 200 };
    }
    const eventsToSend = this._events.splice(0, arrayLength);
    return this._transport.sendEventsWithRetry(eventsToSend);
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

    const bufferLimit = this._options.maxCachedEvents ?? 100;

    if (this._events.length >= bufferLimit) {
      // # of events exceeds the limit, flush them.
      this.flush();
    } else {
      // Not ready to flush them, then set
      const uploadIntervalInSec = this._options.uploadIntervalInSec ?? 30;
      this._flushTimer = (setTimeout(() => {
        this.flush();
      }, uploadIntervalInSec * 1000) as any) as number;
    }
  }

  /** Add platform dependent field onto event. */
  private _annotateEvent(event: Event): void {
    event.library = `${SDK_NAME}/${SDK_VERSION}`;
    event.platform = 'Node.js';
  }

  private _setupTransport(): RetryHandler {
    return new RetryHandler(this._apiKey, this._options);
  }
}
