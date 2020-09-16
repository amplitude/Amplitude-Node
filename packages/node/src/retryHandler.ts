import { Event, Options, Transport, TransportOptions, Payload, Status, Response } from '@amplitude/types';
import { HTTPTransport } from './transports';
import { DEFAULT_OPTIONS, BASE_RETRY_TIMEOUT } from './constants';
import { asyncSleep, collectInvalidEventIndices } from '@amplitude/utils';

export class RetryHandler {
  protected readonly _apiKey: string;

  // A map of maps to event buffers for failed events
  // The first key is userId (or ''), and second is deviceId (or '')
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
        this._onEventsError(events, response);
      }
    } finally {
      return response;
    }
  }

  private _setupDefaultTransport(): Transport {
    const transportOptions: TransportOptions = {
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

    // TODO: Refine logic of what happens when we reach the queue limit.
    return this._eventsInRetry < this._options.maxCachedEvents;
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

  private _onEventsError(events: ReadonlyArray<Event>, response: Response): void {
    const invalidEventIndices = new Set<number>(collectInvalidEventIndices(response));
    if (response.body?.code === 400) {
      if (response.body?.missingField || events.length === 1) {
        // Return early if there's an issue with the entire payload
        // or if there's only one event and its invalid
        return;
      }
    }

    events.forEach((event: Event, index: number) => {
      if (invalidEventIndices.has(index)) {
        // End early if there was a 400 that points to this event being wrong
        return;
      }

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
          setTimeout(() => this._retryEventsOnLoop(userId, deviceId), 0);
        }

        this._eventsInRetry++;
        retryBuffer.push(event);
      }
    });
  }

  private async _retryEventsOnLoop(userId: string, deviceId: string): Promise<void> {
    const eventsBuffer = this._getRetryBuffer(userId, deviceId);
    if (!eventsBuffer?.length) {
      this._cleanUpBuffer(userId, deviceId);
      return;
    }

    let eventCount = eventsBuffer.length;

    let numRetries = 0;
    const maxRetries = this._options.maxRetries;

    while (numRetries < maxRetries) {
      try {
        // Don't try any new events that came in, to prevent overwhelming the api servers
        const eventsToRetry = eventsBuffer.slice(0, eventCount);
        const response = await this._transport.sendPayload(this._getPayload(eventsToRetry));
        // Collect invalid event indices and delete them.
        if (response.status === Status.Invalid) {
          const invalidEventIndices = collectInvalidEventIndices(response);
          // Reverse the indices so that splicing doesn't cause any indexing issues.
          invalidEventIndices.reverse().forEach((index: number) => {
            if (index < eventCount) {
              eventsBuffer.splice(index, 1);
            }
          });
          // and remove them from the # of events we send
          eventCount -= invalidEventIndices.length;
          if (eventCount < 1) {
            break;
          }
        }

        // Success! We sent the events
        if (response.status === Status.Success) {
          // Clean up the events
          eventsBuffer.splice(0, eventCount);
          this._eventsInRetry -= eventCount;
          // End the retry loop
          break;
        } else {
          throw new Error(response.status);
        }
      } catch {
        // Go on to next retry loop
        numRetries += 1;
        // If we hit the retry limit
        if (numRetries === maxRetries) {
          // We've tried the events still in eventCount for the max number of tries.
          // Remove them permanently
          eventsBuffer.splice(0, eventCount);
          this._eventsInRetry -= eventCount;
        } else {
          // Cut the # by half (rounded down)
          eventCount = Math.max(eventCount >> 1, 1);
          // Exponential backoff - sleep for BASE_RETRY_TIMEOUT * 2^(failed tries) ms before trying again
          await asyncSleep(BASE_RETRY_TIMEOUT << numRetries);
        }
      }
    }

    // if more events came in during this time,
    // retry them on a new loop
    // otherwise, this call will immediately return on the next event loop.
    setTimeout(() => this._retryEventsOnLoop(userId, deviceId), 0);
  }
}
