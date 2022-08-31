import { Identify } from '@amplitude/identify';
import {
  Client,
  Event,
  Middleware,
  MiddlewareExtra,
  Options,
  Response,
  Retry,
  SKIPPED_RESPONSE,
} from '@amplitude/types';
import { logger, isNodeEnv, isValidEvent } from '@amplitude/utils';
import { RetryHandler } from './retry/defaultRetry';
import { SDK_NAME, SDK_VERSION, DEFAULT_OPTIONS } from './constants';
import { MiddlewareRunner } from './middleware/middlewareRunner';

export class NodeClient implements Client<Options> {
  /** Project Api Key */
  protected readonly _apiKey: string;

  /** Options for the client. */
  protected readonly _options: Options;

  private _events: Event[] = [];
  private _responseListeners: Array<{ resolve: (response: Response) => void; reject: (err: Error) => void }> = [];
  private readonly _transportWithRetry: Retry;
  private _flushTimer: NodeJS.Timeout | null = null;
  private readonly _middlewareRunner: MiddlewareRunner;

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
    this._middlewareRunner = new MiddlewareRunner();
    if (!isNodeEnv()) {
      logger.warn(
        '@amplitude/node initialized in a non-node environment and will not work. If you are planning to add Amplitude to a browser environment, please use amplitude-js',
      );
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
  public async logEvent(event: Event, extra?: MiddlewareExtra): Promise<Response> {
    if (this._options.optOut) {
      return await Promise.resolve(SKIPPED_RESPONSE);
    }

    this._annotateEvent(event);
    this._observeEvent(event);

    let middlewareCompleted = false;
    this._middlewareRunner.run({ event, extra }, () => {
      middlewareCompleted = true;
    });

    if (!middlewareCompleted) {
      logger.warn('Middleware chain skipped logEvent action.');
      return await Promise.resolve(SKIPPED_RESPONSE);
    }

    if (!isValidEvent(event)) {
      logger.warn('Found invalid event - skipping logEvent action.');
      return await Promise.resolve(SKIPPED_RESPONSE);
    }

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

  /**
   * Sends an identify request for a specific user and device ID, given an identify event.
   * Functionally similar to calling logEvent on an event created by the identify object
   *
   * @param userId the user ID that user properties are being attached to
   * @param deviceId the device ID that user properties are being attached to.
   * @param identify the Identify instance containing user property information
   * @returns a Promise containing metadata about the success of sending this identify to the Amplitude API
   */
  public async identify(userId: string | null, deviceId: string | null, identify: Identify): Promise<Response> {
    if (!(identify instanceof Identify)) {
      logger.warn('Invalid Identify object. Skipping operation.');
      return await Promise.resolve(SKIPPED_RESPONSE);
    }

    const identifyEvent = identify.identifyUser(userId, deviceId);
    return await this.logEvent(identifyEvent);
  }

  public addEventMiddleware(middleware: Middleware): NodeClient {
    this._middlewareRunner.add(middleware);
    return this;
  }

  /** Add platform dependent field onto event. */
  private _annotateEvent(event: Event): void {
    event.library = `${SDK_NAME}/${SDK_VERSION}`;

    // mount ingestion metadata information
    if (typeof this._options.ingestionMetadata !== 'undefined') {
      event.ingestion_metadata = {
        ...this._options.ingestionMetadata,
        ...event.ingestion_metadata,
      };
    }
  }

  /** Merge plan field into event */
  private _observeEvent(event: Event): void {
    if (typeof this._options.plan !== 'undefined') {
      event.plan = {
        ...this._options.plan,
        ...event.plan,
      };
    }
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
