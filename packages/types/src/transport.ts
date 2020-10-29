import { Response } from './response';

/**
 * Amplitude request payload definition.
 */
export interface Payload {
  api_key: string;
  events: ReadonlyArray<Event>;
}

/** Transport used sending data to Amplitude */
export interface Transport {
  /**
   * Send the events payload to Amplitude.
   *
   * @param payload Payload with events that should be sent to Amplitude.
   */
  sendPayload(payload: Payload): Promise<Response>;
}

/** JSDoc */
export interface TransportOptions {
  /** Server path destination. */
  serverUrl: string;
  /** Define custom headers */
  headers: { [key: string]: string };
}
