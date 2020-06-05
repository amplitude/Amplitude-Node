import { Client, Event, Options, Transport, TransportOptions, Payload, Status } from '@amplitude/types';
import { SDK_NAME, SDK_VERSION, AMPLITUDE_API_HOST, AMPLITUDE_API_PATH } from './constants';
import { HTTPSTransport, HTTPTransport } from './transports';

export class NodeClient implements Client<Options> {
  /** Project Api Key */
  protected readonly _apiKey: string;

  /** Options for the client. */
  protected readonly _options: Options;

  private _events: Event[];
  private _transport: Transport;

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

    const uploadIntervalInSec = options.uploadIntervalInSec ?? 30;
    var self = this;
    setInterval(function() {
      self.flush();
    }, uploadIntervalInSec * 1000);
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
  public flush(): void {
    // Check if there's 0 events, flush is not needed.
    const arraryLength = this._events.length;
    if (arraryLength === 0) {
      return;
    }

    const response = this._transport.sendPayload(this._getCurrentPayload());
    response.then(res => {
      if (res.status === Status.Success) {
        // Clean up the events
        this._events.splice(0, arraryLength);
      }
    });
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

    // # of events exceeds the limit, flush them.
    if (this._events.length >= bufferLimit) {
      this.flush();
    }
  }

  /** Add platform dependent field onto event. */
  private _annotateEvent(event: Event): void {
    event.library = `${SDK_NAME}/${SDK_VERSION}`;
    event.platform = 'Node.js';
  }

  private _setupTransport(): Transport {
    let transportOptions: TransportOptions;

    if (this._options.serverHost == null && this._options.serverPath == null && this._options.serverProtocal == null) {
      // If all 3 server options are missing, then we default the server to Amplitude.
      transportOptions = {
        serverHost: AMPLITUDE_API_HOST,
        serverPath: AMPLITUDE_API_PATH,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      return new HTTPSTransport(transportOptions);
    } else if (
      this._options.serverHost != null &&
      this._options.serverPath != null &&
      this._options.serverProtocal != null
    ) {
      // If all 3 server options have values, then we use them.
      transportOptions = {
        serverHost: this._options.serverHost,
        serverPath: this._options.serverPath,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      if (this._options.serverProtocal === 'http') {
        return new HTTPTransport(transportOptions);
      } else {
        return new HTTPSTransport(transportOptions);
      }
    } else {
      throw new Error('Server options are not complete. Make sure you provide all 3 server configs.');
    }
  }

  private _getCurrentPayload(): Payload {
    return {
      api_key: this._apiKey,
      events: this._events,
    };
  }
}
