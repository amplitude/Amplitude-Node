import { Event } from './event';
import { Response } from './response';

/** Layer used to send data to Amplitude while retrying throttled events in the right order.  */
export interface RetryClass {
  /**
   * Send the events payload to Amplitude, and retry the events that failed on a loop.
   *
   * @param events The events that should be sent to Amplitude.
   */
  sendEventsWithRetry(events: readonly Event[]): Promise<Response>;
}
