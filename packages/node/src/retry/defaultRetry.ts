import { Event, Options, Status, Response } from '@amplitude/types';
import { BASE_RETRY_TIMEOUT_DEPRECATED, BASE_RETRY_TIMEOUT_DEPRECATED_WARNING } from '../constants';
import { asyncSleep, collectInvalidEventIndices, logger } from '@amplitude/utils';

import { BaseRetryHandler } from './baseRetry';

interface RetryMetadata {
  shouldRetry: boolean;
  shouldReduceEventCount: boolean;
  eventIndicesToRemove: number[];
  response: Response;
}

/**
 * Converts deprecated maxRetries option to retryTimeouts
 */
function convertMaxRetries(maxRetries: number): number[] {
  const retryTimeouts = [];
  let currentTimeout = BASE_RETRY_TIMEOUT_DEPRECATED;
  for (let i = 0; i < maxRetries; i++) {
    retryTimeouts.push(currentTimeout);
    currentTimeout *= 2;
  }
  return retryTimeouts;
}

function isNodeError(err: Error & NodeJS.ErrnoException): boolean {
  return err.code !== undefined && err.errno !== undefined && err.syscall !== undefined;
}

export class RetryHandler extends BaseRetryHandler {
  // A map of maps to event buffers for failed events
  // The first key is userId (or ''), and second is deviceId (or '')
  private readonly _idToBuffer: Map<string, Map<string, Event[]>> = new Map<string, Map<string, Event[]>>();
  private _eventsInRetry = 0;

  public constructor(apiKey: string, options: Partial<Options> = {}) {
    super(apiKey, options);
    if (this._options.maxRetries !== undefined) {
      logger.warn(BASE_RETRY_TIMEOUT_DEPRECATED_WARNING);
      this._options.retryTimeouts = convertMaxRetries(this._options.maxRetries);
      delete this._options.maxRetries;
    }
  }

  /**
   * @inheritDoc
   */
  public async sendEventsWithRetry(events: readonly Event[]): Promise<Response> {
    let response: Response = { status: Status.Unknown, statusCode: 0 };
    let eventsToSend: Event[] = [];
    try {
      eventsToSend = this._pruneEvents(events);
      response = await this._transport.sendPayload(this._getPayload(eventsToSend));
      if (response.status !== Status.Success) {
        throw new Error(response.status);
      }
    } catch (err) {
      if (isNodeError(err)) {
        response = {
          status: Status.SystemError,
          statusCode: 0,
          error: err,
        };
      } else {
        logger.warn('Unknown error caught when sending events');
        logger.warn(err);
      }
      if (this._shouldRetryEvents()) {
        this._onEventsError(eventsToSend, response);
      }
    }

    return response;
  }

  private _shouldRetryEvents(): boolean {
    if (this._options.retryTimeouts.length === 0) {
      return false;
    }

    // TODO: Refine logic of what happens when we reach the queue limit.
    return this._eventsInRetry < this._options.maxCachedEvents;
  }

  // Sends events with ids currently in active retry buffers straight
  // to the retry buffer they should be in
  private _pruneEvents(events: readonly Event[]): Event[] {
    const prunedEvents: Event[] = [];
    if (Array.isArray(events)) {
      for (const event of events) {
        const { user_id: userId = '', device_id: deviceId = '' } = event;
        // We can ignore events with neither. They would fail anyways when sent as event.
        if (userId.length > 0 || deviceId.length > 0) {
          const retryBuffer = this._getRetryBuffer(userId, deviceId);
          if (retryBuffer !== null) {
            retryBuffer.push(event);
            this._eventsInRetry++;
          } else {
            prunedEvents.push(event);
          }
        }
      }
    }

    return prunedEvents;
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

    return { shouldRetry, shouldReduceEventCount, eventIndicesToRemove, response };
  }

  private async _retryEventsOnLoop(userId: string, deviceId: string): Promise<void> {
    const eventsBuffer = this._getRetryBuffer(userId, deviceId);
    if (eventsBuffer === null || eventsBuffer.length === 0) {
      this._cleanUpBuffer(userId, deviceId);
      return;
    }

    let eventCount = eventsBuffer.length;

    for (let numRetries = 0; numRetries < this._options.retryTimeouts.length; numRetries++) {
      const sleepDuration = this._options.retryTimeouts[numRetries];
      await asyncSleep(sleepDuration);
      const isLastTry = numRetries === this._options.retryTimeouts.length;
      const eventsToRetry = eventsBuffer.slice(0, eventCount);
      const { shouldRetry, shouldReduceEventCount, eventIndicesToRemove, response } = await this._retryEventsOnce(
        userId,
        deviceId,
        eventsToRetry,
      );
      if (this._options.onRetry !== null)
        this._options.onRetry(response, numRetries, numRetries === this._options.retryTimeouts.length - 1);

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
