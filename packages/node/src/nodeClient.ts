import * as https from 'https';
import { Client, Event, Options, Response, Transport, TransportOptions, Payload, Status } from '@amplitude/types';
import { SDK_NAME, SDK_VERSION, AMPLITUDE_API_HOST, AMPLITUDE_API_PATH } from './constants';
import { HTTPSTransport, HTTPTransport } from './transports';

export class NodeClient implements Client<Options> {
  /** Project Api Key */
  protected readonly _apiKey: string;

  /** Options for the client. */
  protected readonly _options: Options;

  private _events: Event[] = [];
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
    this._transport = this._setupTransport();
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
  public flush(): Promise<Response> {
    // Record the current last event index
    const arraryLength = this._events.length;
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
    // Check if queue reaches to the limit and flush them.
    this._checkNeedFlush();

    const payload = JSON.stringify({
      api_key: this._apiKey,
      events: [event],
    });

    const requestOptions = {
      hostname: AMPLITUDE_API_HOST,
      path: AMPLITUDE_API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(requestOptions, res => {
      res.on('data', _ => {
        // Request finishes.
        // We currently don't have error handling or retry, but we will add it soon.
      });
    });

    req.on('error', error => {
      console.info('[Amplitude|Error] Event is not submitted.', error);
    });

    req.write(payload);
    req.end();
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

  private _checkNeedFlush() {
    const bufferLimit = this._options.maxaCachedEvents ?? 100;
    if (this._events.length >= bufferLimit) {
      this.flush();
    }
  }

  private _getCurrentPayload(): Payload {
    return {
      api_key: this._apiKey,
      events: this._events,
    };
  }
}
