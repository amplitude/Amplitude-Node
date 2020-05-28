import { Payload } from './payload';
import { Response } from './response';

/** Transport used sending data to Amplitude */
export interface Transport {
  /**
   * Send the events payload to Amplitude.
   *
   * @param payload Payload with events that should be sent to Amplitude.
   */
  sendPayload(payload: Payload): PromiseLike<Response>;
}

/** JSDoc */
export interface TransportOptions {
  /** Server url destination. */
  serverUrl?: string;
  /** Define custom headers */
  headers?: { [key: string]: string };
}
