import { Event } from '@amplitude/types';
import { isValidEvent } from '../src/validate';

describe('isValidEvent', () => {
  it('should pass on valid events with device id', () => {
    const validEvent: Event = {
      event_type: 'NOT_A_REAL_EVENT_TYPE',
      device_id: 'NOT_A_REAL_DEVICE_ID',
    };

    expect(isValidEvent(validEvent)).toBe(true);
  });

  it('should pass on valid events with user id', () => {
    const validEvent: Event = {
      event_type: 'NOT_A_REAL_EVENT_TYPE',
      user_id: 'NOT_A_REAL_USER_ID',
    };

    expect(isValidEvent(validEvent)).toBe(true);
  });

  it('should fail on valid events with no user or device id', () => {
    const validEvent: Event = {
      event_type: 'NOT_A_REAL_EVENT_TYPE',
    } as any;

    expect(isValidEvent(validEvent)).toBe(false);
  });

  it('should fail on valid events with an invalid event type', () => {
    const validEvent: Event = {
      event_type: 3,
      user_id: 'NOT_A_REAL_USER_ID',
    } as any;

    expect(isValidEvent(validEvent)).toBe(false);
  });
});
