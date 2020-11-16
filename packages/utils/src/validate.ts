import { Event } from '@amplitude/types';
import { logger } from './logger';

export const isValidEvent = (event: Event): boolean => {
  if (typeof event.event_type !== 'string') {
    logger.warn('Invalid event: expected string for event_type field');
    return false;
  }

  if (event.device_id === undefined && event.user_id === undefined) {
    logger.warn('Invalid event: expected at least one of device or user id');
    return false;
  }

  return true;
};
