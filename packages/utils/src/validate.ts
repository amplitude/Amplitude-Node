import { Event } from '@amplitude/types';
import { logger } from './logger';

export const isValidEvent = (event: Event): boolean => {
  if (typeof event.event_type !== 'string') {
    logger.warn('Invalid event: expected string for event_type field');
    return false;
  }

  const hasDeviceId = event.device_id !== undefined;
  const hasUserId = event.user_id !== undefined;

  if (!hasDeviceId && !hasUserId) {
    logger.warn('Invalid event: expected at least one of device or user id');
    return false;
  }

  if (hasDeviceId && typeof event.device_id !== 'string') {
    logger.warn('Invalid event: expected device id to be a string if present');
    return false;
  }

  if (hasUserId && typeof event.user_id !== 'string') {
    logger.warn('Invalid event: expected user id to be a string if present');
    return false;
  }

  return true;
};
