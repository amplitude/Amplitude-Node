import { Event } from './event';

/** Transport used sending data to Amplitude */
export interface Transport {
  /**
   * Sends the events with post body endpoint in Amplitude.
   *
   * @param events Events array that should be sent to Amplitude.
   */
  sendEvent(events: Event[]): PromiseLike<Response>;
}
