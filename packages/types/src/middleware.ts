import { Event } from './event';

// Generic blob to let users pass data to middleware
export interface Extra {
  [name: string]: any;
}

// export type MiddlewarePayloadInternal = MiddlewarePayload & { out: MiddlewarePayload };
export interface MiddlewarePayload {
  event: Event;
  extra?: Extra;
}

export type Next = (payload: MiddlewarePayload) => void;

export type Middleware = (payload: MiddlewarePayload, next: Next) => void;
