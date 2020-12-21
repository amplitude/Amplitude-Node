import { Event, Options, Transport, Payload, Status, Response, RetryClass } from '@amplitude/types';
import { collectInvalidEventIndices } from '@amplitude/utils';

import { DEFAULT_OPTIONS } from '../constants';
import { setupDefaultTransport } from '../transports';

export class RetryHandler implements RetryClass {
  protected readonly _apiKey: string;

  // A map of maps to event buffers for failed events
  // The first key is userId (or ''), and second is deviceId (or '')
  protected readonly _options: Options;
  private readonly _transport: Transport;
  private readonly _eventsToRetry: Event[] = [];

  public constructor(apiKey: string, options: Partial<Options>) {
    this._apiKey = apiKey;
    this._options = Object.assign({}, DEFAULT_OPTIONS, options);
    this._transport = this._options.transportClass ?? setupDefaultTransport(this._options);
  }

  /**
   * @inheritDoc
   */
  public async sendEventsWithRetry(events: readonly Event[]): Promise<Response> {
    let response: Response = { status: Status.Unknown, statusCode: 0 };
    try {
      response = await this._transport.sendPayload(this._getPayload(events));
      if (response.status !== Status.Success) {
        throw new Error(response.status);
      }
    } catch {
      this._onEventsError(events, response);
    }

    return response;
  }

  private _getPayload(events: readonly Event[]): Payload {
    const eventsToRetry = this._eventsToRetry.splice(0, this._eventsToRetry.length);
    return {
      api_key: this._apiKey,
      events: [...eventsToRetry, ...events],
    };
  }

  private _onEventsError(events: readonly Event[], response: Response): void {
    let newEventsToRetry: readonly Event[] = events;
    // See if there are any events we can immediately throw out
    if (response.status === Status.Invalid) {
      if (typeof response.body?.missingField === 'string' || events.length === 1) {
        // Return early if there's an issue with the entire payload
        // or if there's only one event and its invalid
        return;
      } else if (response.body !== undefined) {
        const invalidEventIndices = new Set<number>(collectInvalidEventIndices(response));
        newEventsToRetry = events.filter((_, index) => !invalidEventIndices.has(index));
      }
    } else if (response.status === Status.Success) {
      // In case _onEventsError was called when we were actually successful
      // In which case, why even start retrying events?
      return;
    }

    this._eventsToRetry.push(...newEventsToRetry);
  }
}
