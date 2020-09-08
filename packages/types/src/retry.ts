import { Event } from './event';
import { Response } from './response';

/** Transport used sending data to Amplitude */
export interface RetryClass {
  /**
   * A callback that is used when sendEventsWithRetry fails to send a payload
   *
   * @param events
   */
  onEventError(events: Array<Event>): Promise<Response>;

  /**
   * Send the events payload to Amplitude, internally .
   *
   * @param events The events that should be sent to Amplitude.
   */
  sendEventsWithRetry(events: Array<Event>): Promise<Response>;

  /**
   * Whether or not the retry handler is currently accepting new events to retry.
   */
  shouldRetryEvents(): boolean;
}
