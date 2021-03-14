import { Event, Options, Transport, Payload, PayloadOptions, Status, Response, Retry } from '@amplitude/types';
import { setupDefaultTransport } from '../transports';
import { DEFAULT_OPTIONS } from '../constants';

export class BaseRetryHandler implements Retry {
  protected readonly _apiKey: string;
  protected readonly _options: Options;
  protected readonly _transport: Transport;

  public constructor(apiKey: string, options: Partial<Options> = {}) {
    this._apiKey = apiKey;
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._transport = this._options.transportClass ?? setupDefaultTransport(this._options);
  }

  /**
   * @inheritDoc
   */
  public async sendEventsWithRetry(events: readonly Event[]): Promise<Response> {
    let response: Response = { status: Status.Unknown, statusCode: 0 };
    response = await this._transport.sendPayload(this._getPayload(events));
    return response;
  }

  protected _getPayloadOptions(): { options?: PayloadOptions } {
    if (typeof this._options.minIdLength === 'number') {
      return {
        options: {
          min_id_length: this._options.minIdLength,
        },
      };
    }
    return {};
  }

  protected _getPayload(events: readonly Event[]): Payload {
    return {
      api_key: this._apiKey,
      events,
      ...this._getPayloadOptions(),
    };
  }
}
