import { Event, Options, Transport, TransportOptions, Payload, Status, Response, RetryClass } from '@amplitude/types';
import { HTTPTransport } from './transports';
import { DEFAULT_OPTIONS, BASE_RETRY_TIMEOUT } from './constants';
import { asyncSleep, collectInvalidEventIndices } from '@amplitude/utils';

interface RetryMetadata {
  shouldRetry: boolean;
  shouldReduceEventCount: boolean;
  eventIndicesToRemove: number[];
}

export class RetryHandler implements RetryClass {
  protected readonly _apiKey: string;

  // A map of maps to event buffers for failed events
  // The first key is userId (or ''), and second is deviceId (or '')
  private readonly _idToBuffer: Map<string, Map<string, Event[]>> = new Map<string, Map<string, Event[]>>();
  private readonly _options: Options;
  private readonly _transport: Transport;
  private _eventsInRetry = 0;

  public constructor(apiKey: string, options: Partial<Options>) {
    this._apiKey = apiKey;
    this._options = Object.assign({}, DEFAULT_OPTIONS, options);
    this._transport = this._options.transportClass ?? this._setupDefaultTransport();
  }

  /**
   * @inheritDoc
   */
  public async sendEventsWithRetry(events: readonly Event[]): Promise<Response> {
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
    }

    return response;
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
  private _pruneEvents(events: readonly Event[]): Event[] {
    const prunedEvents: Event[] = [];
    events.forEach(event => {
      const { user_id: userId = '', device_id: deviceId = '' } = event;
      if (userId.length > 0 || deviceId.length > 0) {
        const retryBuffer = this._getRetryBuffer(userId, deviceId);
        if (retryBuffer !== null) {
          retryBuffer.push(event);
          this._eventsInRetry++;
        } else {
          prunedEvents.push(event);
        }
      }
    });

    return prunedEvents;
  }

  private _getPayload(events: readonly Event[]): Payload {
    return {
      api_key: this._apiKey,
      events,
    };
  }

  private _getRetryBuffer(userId: string, deviceId: string): Event[] | null {
    const deviceToBufferMap = this._idToBuffer.get(userId);
    if (deviceToBufferMap === undefined) {
      return null;
    }

    return deviceToBufferMap.get(deviceId) ?? null;
  }

  // cleans up the id to buffer map if the job is done
  private _cleanUpBuffer(userId: string, deviceId: string): void {
    const deviceToBufferMap = this._idToBuffer.get(userId);
    if (deviceToBufferMap === undefined) {
      return;
    }

    const eventsToRetry = deviceToBufferMap.get(deviceId);
    if (eventsToRetry !== undefined && eventsToRetry.length === 0) {
      deviceToBufferMap.delete(deviceId);
    }

    if (deviceToBufferMap.size === 0) {
      this._idToBuffer.delete(userId);
    }
  }

  private _onEventsError(events: readonly Event[], response: Response): void {
    let eventsToRetry: readonly Event[] = events;
    // See if there are any events we can immediately throw out
    if (response.status === Status.RateLimit && response.body !== undefined) {
      const { exceededDailyQuotaUsers, exceededDailyQuotaDevices } = response.body;
      eventsToRetry = events.filter(({ user_id: userId, device_id: deviceId }) => {
        return (
          !(userId !== undefined && userId in exceededDailyQuotaUsers) &&
          !(deviceId !== undefined && deviceId in exceededDailyQuotaDevices)
        );
      });
    } else if (response.status === Status.Invalid) {
      if (typeof response.body?.missingField === 'string' || events.length === 1) {
        // Return early if there's an issue with the entire payload
        // or if there's only one event and its invalid
        return;
      } else if (response.body !== undefined) {
        const invalidEventIndices = new Set<number>(collectInvalidEventIndices(response));
        eventsToRetry = events.filter((_, index) => !invalidEventIndices.has(index));
      }
    } else if (response.status === Status.Success) {
      // In case _onEventsError was called when we were actually successful
      // In which case, why even start retrying events?
      return;
    }

    eventsToRetry.forEach((event: Event) => {
      const { user_id: userId = '', device_id: deviceId = '' } = event;
      if (userId.length > 0 || deviceId.length > 0) {
        let deviceToBufferMap = this._idToBuffer.get(userId);
        if (deviceToBufferMap === undefined) {
          deviceToBufferMap = new Map<string, Event[]>();
          this._idToBuffer.set(userId, deviceToBufferMap);
        }

        let retryBuffer = deviceToBufferMap.get(deviceId);
        if (retryBuffer === undefined) {
          retryBuffer = [];
          deviceToBufferMap.set(deviceId, retryBuffer);
          // In the next event loop, start retrying these events
          setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this._retryEventsOnLoop(userId, deviceId);
          }, 0);
        }

        this._eventsInRetry++;
        retryBuffer.push(event);
      }
    });
  }

  private async _retryEventsOnce(
    userId: string,
    deviceId: string,
    eventsToRetry: readonly Event[],
  ): Promise<RetryMetadata> {
    const response = await this._transport.sendPayload(this._getPayload(eventsToRetry));

    let shouldRetry = true;
    let shouldReduceEventCount = false;
    let eventIndicesToRemove: number[] = [];

    if (response.status === Status.RateLimit) {
      // RateLimit: See if we hit the daily quota
      if (response.body !== undefined) {
        const { exceededDailyQuotaUsers, exceededDailyQuotaDevices } = response.body;
        if (deviceId in exceededDailyQuotaDevices || userId in exceededDailyQuotaUsers) {
          shouldRetry = false; // This device/user may not be retried for a while. Just give up.
        }
      }

      shouldReduceEventCount = true; // Reduce the payload to reduce risk of throttling
    } else if (response.status === Status.PayloadTooLarge) {
      shouldReduceEventCount = true;
    } else if (response.status === Status.Invalid) {
      if (eventsToRetry.length === 1) {
        shouldRetry = false; // If there's only one event, just toss it.
      } else {
        eventIndicesToRemove = collectInvalidEventIndices(response); // Figure out which events need to go.
      }
    } else if (response.status === Status.Success) {
      // Success! We sent the events
      shouldRetry = false; // End the retry loop
    }

    return { shouldRetry, shouldReduceEventCount, eventIndicesToRemove };
  }

  private async _retryEventsOnLoop(userId: string, deviceId: string): Promise<void> {
    const eventsBuffer = this._getRetryBuffer(userId, deviceId);
    if (eventsBuffer === null || eventsBuffer.length > 0) {
      this._cleanUpBuffer(userId, deviceId);
      return;
    }

    let eventCount = eventsBuffer.length;

    let numRetries = 0;
    const maxRetries = this._options.maxRetries;

    while (numRetries < maxRetries) {
      numRetries += 1;
      const isLastTry = numRetries === maxRetries;

      try {
        // Don't try any new events that came in, to prevent overwhelming the api servers
        const eventsToRetry = eventsBuffer.slice(0, eventCount);
        const { shouldRetry, shouldReduceEventCount, eventIndicesToRemove } = await this._retryEventsOnce(
          userId,
          deviceId,
          eventsToRetry,
        );

        // Collect invalid event indices and remove them.
        if (eventIndicesToRemove.length > 0) {
          let numEventsRemoved = 0;
          // Reverse the indices so that splicing doesn't cause any indexing issues.
          Array.from(eventIndicesToRemove)
            .reverse()
            .forEach(index => {
              if (index < eventCount) {
                eventsBuffer.splice(index, 1);
                numEventsRemoved += 1;
              }
            });

          eventCount -= numEventsRemoved;
          this._eventsInRetry -= eventCount;
          if (eventCount < 1) {
            break; // If we managed to remove all the events, break off early.
          }
        }

        if (!shouldRetry) {
          break; // We ended!
        }

        if (shouldReduceEventCount && !isLastTry) {
          eventCount = Math.max(eventCount >> 1, 1);
        }

        throw new Error(); // If we didn't end, continue to catch block.
      } catch {
        if (!isLastTry) {
          // If we haven't hit the retry limit, some Exponential backoff
          await asyncSleep(BASE_RETRY_TIMEOUT << numRetries); // Sleep for BASE_RETRY_TIMEOUT * 2^(failed tries) ms
        }
      }
    }

    // Clean up the events
    // Either because they were sent, or because we decided to no longer try them
    eventsBuffer.splice(0, eventCount);
    this._eventsInRetry -= eventCount;

    // if more events came in during this time,
    // retry them on a new loop
    // otherwise, this call will immediately return on the next event loop.
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this._retryEventsOnLoop(userId, deviceId);
    }, 0);
  }
}
