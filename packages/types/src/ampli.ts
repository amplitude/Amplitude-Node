import { BaseEvent } from './baseEvent';
import { GroupIdentifyEvent, IdentifyEvent } from './identify';

export type TrackOptions = Omit<BaseEvent, 'event_type' | 'event_properties'>;

export type IdentifyOptions = Omit<IdentifyEvent, 'event_type' | 'event_properties' | 'user_properties'>;

export type GroupOptions = Omit<GroupIdentifyEvent, 'event_type' | 'event_properties' | 'group_properties'>;
