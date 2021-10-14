import { Event } from './event';
import { Options } from './options';
import { Response } from './response';
import { Middleware, MiddlewareExtra } from './middleware';

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
   * @param extra Unstructured extra data to pass to Middleware.
   */
  logEvent(event: Event, extra?: MiddlewareExtra): Promise<Response>;

  /**
   * Adds a new middleware function to run on each logEvent() call prior to sending to Amplitude.
   *
   * @param middleware The middleware method
   */
  addEventMiddleware(middleware: Middleware): Client;

  /**
   * Flush and send all the events which haven't been sent.
   */
  flush(): Promise<Response>;
}
