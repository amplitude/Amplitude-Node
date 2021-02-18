import { Event, Options, Transport, Payload, Status, Response, RetryClass } from '@amplitude/types';
import { AsyncQueue, collectInvalidEventIndices } from '@amplitude/utils';

import { DEFAULT_OPTIONS } from '../constants';
import { setupDefaultTransport } from '../transports';

/**
 * A retry handler made specifically to handle a strategy where
 * the server network connection is not always available. (e.g. executing node code on a client device).
 * Instead of retrying events on a loop, this will save untried events
 */
export class OfflineRetryHandler implements RetryClass {
  protected readonly _apiKey: string;

  // A map of maps to event buffers for failed events
  // The first key is userId (or ''), and second is deviceId (or '')
  protected readonly _options: Options;
  private readonly _transport: Transport;
  private _eventsToRetry: Event[] = [];
  private readonly _requestQueue: AsyncQueue = new AsyncQueue();

  public constructor(apiKey: string, options: Partial<Options> = {}) {
    this._apiKey = apiKey;
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._transport = this._options.transportClass ?? setupDefaultTransport(this._options);
  }

  /**
   * @inheritDoc
   */
  public async sendEventsWithRetry(events: readonly Event[]): Promise<Response> {
    return await this._requestQueue.addToQueue(async () => {
      let response: Response = { status: Status.Unknown, statusCode: 0 };

      try {
        response = await this._transport.sendPayload(this._getPayload(events));
        if (response.status !== Status.Success) {
          throw new Error(response.status);
        } else {
          this._onSendSuccess();
        }
      } catch {
        this._onSendError(events, response);
      }

      return response;
    });
  }

  private _getPayload(events: readonly Event[]): Payload {
    return {
      api_key: this._apiKey,
      events: [...this._eventsToRetry, ...events],
    };
  }

  private _onSendSuccess(): void {
    // If we successfully sent all the events, reset the queue!
    this._eventsToRetry = [];
  }

  private _onSendError(events: readonly Event[], response: Response): void {
    let newEventsToRetry: Event[] = Array.from(events);
    // See if there are any events we can immediately throw out
    if (response.status === Status.Invalid) {
      if (typeof response.body?.missingField === 'string' || events.length === 1) {
        // Don't retry anything if there's an issue with the entire payload
        // or if there's only one event and its invalid
        newEventsToRetry = [];
      } else if (response.body !== undefined) {
        const invalidEventIndices = new Set<number>(collectInvalidEventIndices(response));
        newEventsToRetry = events.filter((_, index) => !invalidEventIndices.has(index));
      }
    } else if (response.status === Status.Success) {
      // In case _onEventsError was called when we were actually successful
      // In which case, why even start retrying events?
      newEventsToRetry = [];
    }

    this._eventsToRetry = newEventsToRetry;
    // If we have too many events, delete the OLDEST events.
    if (this._eventsToRetry.length > this._options.maxCachedEvents) {
      const numExceededEvents = this._eventsToRetry.length - this._options.maxCachedEvents;
      this._eventsToRetry.splice(0, numExceededEvents);
    }
  }
}
