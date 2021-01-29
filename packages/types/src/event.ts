import { BaseEvent } from './baseEvent';
import { IdentifyEvent } from './identify';

export type Event = BaseEvent | IdentifyEvent;
