import { Client, Event, Options, Transport, TransportOptions, Payload, Status } from '@amplitude/types';
import { SDK_NAME, SDK_VERSION, AMPLITUDE_SERVER_URL } from './constants';
import { logger } from '@amplitude/utils';
import { HTTPTransport } from './transports';

export class NodeClient implements Client<Options> {
  /** Project Api Key */
  protected readonly _apiKey: string;

  /** Options for the client. */
  protected readonly _options: Options;

  private _events: Event[];
  private _transport: Transport;
  private _flushTimer: number = 0;
  private _uploadInProgress: boolean = false;
  private _eventsToRetry: Event[];
  private _idsToRetry: Set<string>;

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
    this._eventsToRetry = [];
    this._idsToRetry = new Set<string>();
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
  public async flush(): Promise<void> {
    // Clear the timeout
    clearTimeout(this._flushTimer);

    // If there's an upload currently in progress, wait for it to finish first.
    await this._waitForUpload();

    // Check if there's 0 events, flush is not needed.
    const arrayLength = this._events.length;
    if (arrayLength === 0) {
      return;
    }

    this._uploadInProgress = true;
    try {
      const response = await this._transport.sendPayload(this._getCurrentPayload());
      if (response.status === Status.Success) {
        // Clean up the events
        this._events.splice(0, arrayLength);
      }
    } catch {
      const failedEvents = this._events.slice(0, arrayLength);
      failedEvents.forEach(event => {
        if (typeof event.user_id === 'string') {
          this._idsToRetry.add(event.user_id);
        } else if (typeof event.device_id === 'string') {
          this._idsToRetry.add(event.device_id);
        }
        // events should either have user or device id
      });

      const events: Array<Event> = [];
      const eventsToRetry: Array<Event> = [];
      this._events.forEach(event => {
        let hasId = this._idsToRetry.has(event.user_id ?? event.device_id ?? '');

        if (hasId) {
          eventsToRetry.push(event);
        } else {
          events.push(event);
        }
      });

      this._events = events;
      this._eventsToRetry.push(...eventsToRetry);
      this._retryEvents(eventsToRetry.length);
    } finally {
      this._uploadInProgress = false;
    }
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
    if (this._idsToRetry.has(event.user_id ?? event.device_id ?? '')) {
      this._eventsToRetry.push(event);
    } else {
      this._events.push(event);
    }

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

  private _setupTransport(): Transport {
    let transportOptions: TransportOptions;
    transportOptions = {
      serverUrl: this._options.serverUrl || AMPLITUDE_SERVER_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    return new HTTPTransport(transportOptions);
  }

  private _getCurrentPayload(): Payload {
    return {
      api_key: this._apiKey,
      events: this._events,
    };
  }

  private _getRetryPayload(): Payload {
    return {
      api_key: this._apiKey,
      events: this._eventsToRetry,
    };
  }

  private async _waitForUpload(): Promise<void> {
    return new Promise(resolve => {
      let interval = 0;
      interval = (setInterval(() => {
        if (!this._uploadInProgress) {
          clearInterval(interval);
          resolve();
        }
      }, 1) as any) as number;
    });
  }

  private async _retryEvents(numEvents: number): Promise<void> {
    let numRetries = 0;

    while (typeof this._options.maxRetries === 'number' && numRetries < this._options.maxRetries) {
      // If there's an upload currently in progress, wait for it to finish first.
      await this._waitForUpload();
      const arrayLength = this._eventsToRetry.length;
      if (arrayLength === 0) {
        return;
      }

      this._uploadInProgress = true;

      try {
        const response = await this._transport.sendPayload(this._getRetryPayload());
        if (response.status === Status.Success) {
          // Clean up the events
          this._eventsToRetry.splice(0, arrayLength);
          this._idsToRetry = this._eventsToRetry.reduce((idSet, event) => {
            if (event.user_id) {
              idSet.add(event.user_id);
            } else if (event.device_id) {
              idSet.add(event.device_id);
            }
            return idSet;
          }, new Set<string>());

          // Successfully sent the events, stop trying
          return;
        }
      } catch {
        // Do nothing if there is a failure, go on to next retry loop
      } finally {
        this._uploadInProgress = false;
        numRetries += 1;
      }
    }

    // We know that we've tried the first numEvents numbers for the maximum number of tries. kick them out
    // wait to make sure there are no uploads in progress
    await this._waitForUpload();
    this._eventsToRetry.splice(0, numEvents);
  }
}
