import { Event, Options, Transport, TransportOptions, Payload, Status, Response } from '@amplitude/types';
import { HTTPTransport } from './transports';
import { DEFAULT_OPTIONS } from './constants';
import { asyncSleep } from '@amplitude/utils';

export class RetryHandler {
  protected readonly _apiKey: string;

  private _idToBuffer: Map<string, Map<string, Array<Event>>> = new Map<string, Map<string, Array<Event>>>();
  private _options: Options;
  private _transport: Transport;
  private _eventsInRetry: number = 0;

  public constructor(apiKey: string, options: Partial<Options>) {
    this._apiKey = apiKey;
    this._options = Object.assign({}, DEFAULT_OPTIONS, options);
    this._transport = this._options.transportClass || this._setupDefaultTransport();
  }

  /**
   * @inheritDoc
   */
  public async sendEventsWithRetry(events: ReadonlyArray<Event>): Promise<Response> {
    let response: Response = { status: Status.Unknown, statusCode: 0 };
    const eventsToSend = this._pruneEvents(events);
    try {
      response = await this._transport.sendPayload(this._getPayload(eventsToSend));
      if (response.status !== Status.Success) {
        throw new Error(response.status);
      }
    } catch {
      if (this._shouldRetryEvents()) {
        this._onEventsError(events);
      }
    } finally {
      return response;
    }
  }

  private _setupDefaultTransport(): Transport {
    let transportOptions: TransportOptions;
    transportOptions = {
      serverUrl: this._options.serverUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    return new HTTPTransport(transportOptions);
  }

  private _shouldRetryEvents(): boolean {
    if (typeof this._options.maxRetries !== 'number' || this._options.maxRetries <= 0) {
      return false;
    }

    const bufferLimit = this._options.maxCachedEvents;

    return this._eventsInRetry < bufferLimit;
  }

  // Sends events with ids currently in active retry buffers straight
  // to the retry buffer they should be in
  private _pruneEvents(events: ReadonlyArray<Event>): Array<Event> {
    const prunedEvents: Array<Event> = [];
    events.forEach(event => {
      const { user_id: userId = '', device_id: deviceId = '' } = event;
      if (userId || deviceId) {
        const retryBuffer = this._getRetryBuffer(userId, deviceId);
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

  private _getPayload(events: ReadonlyArray<Event>): Payload {
    return {
      api_key: this._apiKey,
      events,
    };
  }

  private _getRetryBuffer(userId: string, deviceId: string): Array<Event> | null {
    const deviceToBufferMap = this._idToBuffer.get(userId);
    if (!deviceToBufferMap) {
      return null;
    }

    return deviceToBufferMap.get(deviceId) || null;
  }

  // cleans up the id to buffer map if the job is done
  private _cleanUpBuffer(userId: string, deviceId: string): void {
    const deviceToBufferMap = this._idToBuffer.get(userId);
    if (!deviceToBufferMap) {
      return;
    }

    const eventsToRetry = deviceToBufferMap.get(deviceId);
    if (!eventsToRetry?.length) {
      deviceToBufferMap.delete(deviceId);
    }

    if (deviceToBufferMap.size === 0) {
      this._idToBuffer.delete(userId);
    }
  }

  private _onEventsError(events: ReadonlyArray<Event>): void {
    events.forEach((event: Event) => {
      const { user_id: userId = '', device_id: deviceId = '' } = event;
      if (userId || deviceId) {
        let deviceToBufferMap = this._idToBuffer.get(userId);
        if (!deviceToBufferMap) {
          deviceToBufferMap = new Map<string, Array<Event>>();
          this._idToBuffer.set(userId, deviceToBufferMap);
        }

        let retryBuffer = deviceToBufferMap.get(deviceId);
        if (!retryBuffer) {
          retryBuffer = [];
          deviceToBufferMap.set(deviceId, retryBuffer);
          // In the next event loop, start retrying these events
          setImmediate(() => this._retryEventsOnLoop(userId, deviceId));
        }

        this._eventsInRetry++;
        retryBuffer.push(event);
      }
    });
  }

  private async _retryEventsOnLoop(userId: string, deviceId: string): Promise<void> {
    const eventsToRetry = this._getRetryBuffer(userId, deviceId);
    if (!eventsToRetry?.length) {
      this._cleanUpBuffer(userId, deviceId);
      return;
    }

    const initialEventCount = eventsToRetry.length;

    let numRetries = 0;
    const maxRetries = this._options.maxRetries;

    while (numRetries < maxRetries) {
      // If new events came in in the meantime, collect them as well
      const arrayLength = eventsToRetry.length;
      if (arrayLength === 0) {
        this._cleanUpBuffer(userId, deviceId);
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
        // If we hit the retry limit
        if (numRetries === maxRetries) {
          // We know that we've tried the first events for the maximum number of tries.
          // Remove them permanently
          eventsToRetry.splice(0, initialEventCount);
          this._eventsInRetry -= initialEventCount;
        } else {
          // Exponential backoff - sleep for 2^(failed tries) ms before trying again
          await asyncSleep(1 >> numRetries);
        }
      }
    }

    // if more events came in during this time,
    // retry them on a new loop
    // otherwise, this call will immediately return on the next event loop.
    setImmediate(() => this._retryEventsOnLoop(userId, deviceId));
  }
}
