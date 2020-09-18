import { Client, Event, Options, Status, Response, Transport } from '@amplitude/types';
import { logger } from '@amplitude/utils';
import { setupTransportFromOptions } from './transports';
import { SDK_NAME, SDK_VERSION, DEFAULT_OPTIONS } from './constants';

export class NodeClient implements Client<Options> {
  /** Project Api Key */
  protected readonly _apiKey: string;

  /** Options for the client. */
  protected readonly _options: Options;

  protected readonly _transport: Transport;

  /**
   * Initializes this client instance.
   *
   * @param apiKey API key for your project
   * @param options options for the client
   */
  public constructor(apiKey: string, options: Partial<Options> = {}) {
    this._apiKey = apiKey;
    this._options = Object.assign({}, DEFAULT_OPTIONS, options);
    this._transport = this._options.transportClass || setupTransportFromOptions(this._options);
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
    // Noop
    logger.warn('The simple client does nothing when flushing events.');
    return {
      statusCode: 200,
      status: Status.Success,
      body: {
        code: 200,
        eventsIngested: 0,
        payloadSizeBytes: 0,
        serverUploadTime: 0,
      },
    };
  }

  /**
   * @inheritDoc
   */
  public logEvent(event: Event): void {
    if (this._options.optOut === true) {
      return;
    }

    this._annotateEvent(event);
    // Immediately send the event
    this._transport.sendPayload({ events: [event], api_key: this._apiKey });
  }

  /** Add platform dependent field onto event. */
  private _annotateEvent(event: Event): void {
    event.library = `${SDK_NAME}/${SDK_VERSION}`;
    event.platform = 'Node.js';
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
