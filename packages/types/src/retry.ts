import { Event } from './event';
import { Response } from './response';

/** Transport used sending data to Amplitude */
export interface RetryClass {
  /**
   * Send the events payload to Amplitude, and retry the events that failed on a loop.
   *
   * @param events The events that should be sent to Amplitude.
   */
  sendEventsWithRetry(events: ReadonlyArray<Event>): Promise<Response>;
}
