import { Client, Event, Options, Transport, TransportOptions, Payload, Response, Status } from '@amplitude/types';
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

    // Check if there's 0 events, flush is not needed.
    const arraryLength = this._events.length;
    if (arraryLength === 0) {
      return { status: Status.Success, statusCode: 200 };
    }

    const response = this._transport.sendPayload(this._getCurrentPayload());
    response.then(res => {
      if (res.status === Status.Success) {
        // Clean up the events
        this._events.splice(0, arraryLength);
      }
    });

    return response;
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

    const bufferLimit = this._options.maxCachedEvents || 100;

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
}
