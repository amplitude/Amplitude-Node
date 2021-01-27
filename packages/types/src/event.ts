import { BaseEvent } from './baseEvent';
import { IdentifyEvent } from './identify';

export type Event = BaseEvent | IdentifyEvent;

/**
 * Amplitude request payload options.
 */

export interface PayloadOptions {
  min_id_length?: number;
}

/**
 * Amplitude request payload definition.
 */
export interface Payload extends PayloadOptions {
  api_key: string;
  events: readonly Event[];
  options?: PayloadOptions;
}
