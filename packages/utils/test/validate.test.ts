import { Event } from '@amplitude/types';
import { isValidEvent } from '../src/validate';

describe('isValidEvent', () => {
  it('should pass on valid events with device id', () => {
    const validEvent: Event = {
      event_type: 'VALID_BUT_FAKE_EVENT_TYPE',
      device_id: 'VALID_BUT_FAKE_DEVICE_ID',
    };

    expect(isValidEvent(validEvent)).toBe(true);
  });

  it('should pass on valid events with user id', () => {
    const validEvent: Event = {
      event_type: 'VALID_BUT_FAKE_EVENT_TYPE',
      user_id: 'VALID_BUT_FAKE_USER_ID',
    };

    expect(isValidEvent(validEvent)).toBe(true);
  });

  it('should fail on valid events with no user or device id', () => {
    const invalidEvent: Event = {
      event_type: 'VALID_BUT_FAKE_EVENT_TYPE',
    } as any;

    expect(isValidEvent(invalidEvent)).toBe(false);
  });

  it('should fail on valid events with an invalid event type', () => {
    const invalidEvent: Event = {
      event_type: 3,
      user_id: 'VALID_BUT_FAKE_USER_ID',
    } as any;

    expect(isValidEvent(invalidEvent)).toBe(false);
  });

  it('should fail on valid events with an invalid user id', () => {
    const invalidEvent: Event = {
      event_type: 'VALID_BUT_FAKE_EVENT_TYPE',
      user_id: 3,
    } as any;

    expect(isValidEvent(invalidEvent)).toBe(false);
  });

  it('should fail on valid events with an invalid device id', () => {
    const invalidEvent: Event = {
      event_type: 'VALID_BUT_FAKE_EVENT_TYPE',
      device_id: 3,
    } as any;

    expect(isValidEvent(invalidEvent)).toBe(false);
  });
});
