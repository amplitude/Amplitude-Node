import { BaseEvent } from './baseEvent';
import { GroupIdentifyEvent, IdentifyEvent } from './identify';

/**
 * Optional Event fields
 */
export type EventOptions = Omit<BaseEvent, 'event_type' | 'event_properties'>;

/**
 * Optional Identify fields
 */
export type IdentifyOptions = Omit<IdentifyEvent, 'event_type' | 'event_properties' | 'user_properties'>;

/**
 * Optional Group fields
 */
export type GroupOptions = Omit<GroupIdentifyEvent, 'event_type' | 'event_properties' | 'group_properties'>;
