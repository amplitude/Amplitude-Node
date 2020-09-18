import { Event, NodeOptions, Transport, Payload, Status, Response } from '@amplitude/types';
import { setupTransportFromOptions } from './transports';
import { DEFAULT_OPTIONS, BASE_RETRY_TIMEOUT } from './constants';
import { asyncSleep } from '@amplitude/utils';

export class RetryHandler {
  protected readonly _apiKey: string;

  // A map of maps to event buffers for failed events
  // The first key is userId (or ''), and second is deviceId (or '')
  private _idToBuffer: Map<string, Map<string, Array<Event>>> = new Map<string, Map<string, Array<Event>>>();
  private _options: NodeOptions;
  private _transport: Transport;
  private _eventsInRetry: number = 0;

  public constructor(apiKey: string, options: Partial<NodeOptions>) {
    this._apiKey = apiKey;
    this._options = Object.assign({}, DEFAULT_OPTIONS, options);
    this._transport = this._options.transportClass || setupTransportFromOptions(this._options);
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
        // We don't want to retry payloads that returned with status 200 OR 400
        // The first is the case where we succeeded in sending the payload
        // The second means that the payload is malformed OR the user/device is silenced
        // In which case it would not make sense for us to retry any further.
        if (response.status === Status.Success || response.status === Status.Invalid) {
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
