import { Event } from './event';
import { Options } from './options';
import { Response } from './response';

/**
 * User-Facing Amplitude SDK Client.
 *
 * This interface contains all methods needed with the SDK once it has
 * been installed.
 *
 */
export interface Client<O extends Options = Options> {
  /** Return the current options */
  getOptions(): O;

  /**
   * Captures a manually created event and sends it to Amplitude.
   *
   * @param event The event to send to Amplitude.
   */
  logEvent(event: Event): Promise<Response>;

  /**
   * Flush and send all the events which haven't been sent.
   */
  flush(): void;
}
