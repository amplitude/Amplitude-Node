import { Event } from './event';

/**
 * Amplitude request payload definition.
 */
export interface Payload {
  api_key: string;
  events: Event[];
}
