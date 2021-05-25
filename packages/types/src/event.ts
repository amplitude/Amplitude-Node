import { BaseEvent } from './baseEvent';
import { IdentifyEvent, GroupIdentifyEvent } from './identify';

export type Event = BaseEvent | IdentifyEvent | GroupIdentifyEvent;
