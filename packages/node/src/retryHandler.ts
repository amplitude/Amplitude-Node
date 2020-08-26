import { Event, Options, Transport, TransportOptions, Payload, Status, Response } from '@amplitude/types';
import { AMPLITUDE_SERVER_URL } from './constants';
import { HTTPTransport } from './transports';

export class RetryHandler {
  protected readonly _apiKey: string;

  private _idToBuffer: Map<string, Array<Event>> = new Map<string, Array<Event>>();
  private _options: Options;
  private _transport: Transport;
  private _eventsInRetry: number = 0;

  public constructor(apiKey: string, options: Options) {
    this._apiKey = apiKey;
    this._options = options;
    this._transport = this._setupTransport();
  }

  public async sendEventsWithRetry(events: ReadonlyArray<Event>): Promise<Response> {
    let response: Response = { status: Status.Unknown, statusCode: 0 };
    const eventsToSend = this._pruneEvents(events);
    try {
      response = await this._transport.sendPayload(this._getPayload(eventsToSend));
      if (response.status !== Status.Success) {
        throw new Error(response.status);
      }
    } catch {
      if (this._shouldAttemptRetry()) {
        this._queueFailedEvents(events);
      }
    } finally {
      return response;
    }
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

  private _shouldAttemptRetry(): boolean {
    if (typeof this._options.maxRetries === 'number' && this._options.maxRetries <= 0) {
      return false;
    }

    const bufferLimit = this._options.maxCachedEvents ?? 100;

    return this._eventsInRetry < bufferLimit;
  }

  // Sends events with ids currently in active retry buffers straight
  // to the retry buffer they should be in
  private _pruneEvents(events: ReadonlyArray<Event>): Array<Event> {
    const prunedEvents: Array<Event> = [];
    events.forEach(event => {
      const id = this._getId(event);
      if (id) {
        const retryBuffer = this._idToBuffer.get(id);
        if (retryBuffer?.length) {
          retryBuffer.push(event);
          this._eventsInRetry++;
        } else {
          prunedEvents.push(event);
        }
      }
    });

    return prunedEvents;
  }

  private _getId(event: Event): string | void {
    // events should either have user or device id
    if (typeof event.user_id === 'string') {
      return event.user_id;
    } else if (typeof event.device_id === 'string') {
      return event.device_id;
    }
  }

  private _getPayload(events: ReadonlyArray<Event>): Payload {
    return {
      api_key: this._apiKey,
      events,
    };
  }

  private _cleanUpBuffer(id: string): void {
    const eventsToRetry = this._idToBuffer.get(id);
    if (!eventsToRetry) {
      return;
    } else if (!eventsToRetry.length) {
      this._idToBuffer.delete(id);
      return;
    }
  }

  private _queueFailedEvents(events: ReadonlyArray<Event>): void {
    const newIds: Array<string> = [];
    events.forEach((event: Event) => {
      const id = this._getId(event);
      if (id) {
        let retryBuffer = this._idToBuffer.get(id);
        if (!retryBuffer) {
          retryBuffer = [];
          this._idToBuffer.set(id, retryBuffer);
          newIds.push(id);
          this._eventsInRetry++;
          // In the next event loop, start retrying these events
          setImmediate(() => this._retryEvents(id));
        }

        retryBuffer.push(event);
      }
    });
  }

  private async _retryEvents(id: string): Promise<void> {
    const eventsToRetry = this._idToBuffer.get(id);
    if (!eventsToRetry?.length) {
      this._cleanUpBuffer(id);
      return;
    }

    const initialEventCount = eventsToRetry.length;

    let numRetries = 0;
    const maxRetries = this._options.maxRetries ?? 0;

    while (numRetries < maxRetries) {
      // If new events came in in the meantime, collect them as well
      const arrayLength = eventsToRetry.length;
      if (arrayLength === 0) {
        this._cleanUpBuffer(id);
        return;
      }

      try {
        const response = await this._transport.sendPayload(this._getPayload(eventsToRetry));
        if (response.status === Status.Success) {
          // Clean up the events
          eventsToRetry.splice(0, arrayLength);
          this._eventsInRetry -= arrayLength;
          // Successfully sent the events, stop trying
          break;
        } else {
          throw new Error(response.status);
        }
      } catch {
        // Go on to next retry loop
        numRetries += 1;
      }
    }

    // If we exited the loop by hitting the retry limit
    if (numRetries === maxRetries) {
      // We know that we've tried the first events for the maximum number of tries.
      // Remove them permanently
      eventsToRetry.splice(0, initialEventCount);
      this._eventsInRetry -= initialEventCount;
    }

    // if more events came in during this time,
    // retry them on a new loop
    // otherwise, this call will immediately return on the next event loop.
    setImmediate(() => this._retryEvents(id));
  }
}
