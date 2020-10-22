import { DefaultIdentity } from '../src/identity';
import { DEVICE_ID_LENGTH } from '@amplitude/utils';

const DEVICE_ID = 'NOT_A_REAL_DEVICE_ID';
// Intentional any to overrule any later on type checking
const BAD_ID: any = [];
const USER_ID = 'NOT_A_REAL_USER_ID';

describe('default identity behavior', () => {
  it('should generate a device ID if passed no option', () => {
    const identity = new DefaultIdentity();
    identity.initializeDeviceId();

    expect(identity.getDeviceId()).toBeTruthy();
    expect(identity.getDeviceId().length).toBe(DEVICE_ID_LENGTH);
  });

  it('should generate a device ID if not initialized', () => {
    const identity = new DefaultIdentity();
    // Note: Not calling device ID

    expect(identity.getDeviceId()).toBeTruthy();
    expect(identity.getDeviceId().length).toBe(DEVICE_ID_LENGTH);
  });

  it('should use the passed in device ID ', () => {
    const identity = new DefaultIdentity();
    identity.initializeDeviceId(DEVICE_ID);

    expect(identity.getDeviceId()).toBe(DEVICE_ID);
  });

  it('should not use the passed in device ID if invalid', () => {
    const identity = new DefaultIdentity();
    identity.initializeDeviceId(BAD_ID); // arrays are not valid device ID's

    expect(identity.getDeviceId() === BAD_ID).toBe(false);
  });

  it('should not initialize device ID twice', () => {
    const identity = new DefaultIdentity();
    identity.initializeDeviceId();
    identity.initializeDeviceId(DEVICE_ID); // should do nothing

    expect(identity.getDeviceId() === DEVICE_ID).toBe(false);
    expect(identity.getDeviceId().length).toBe(DEVICE_ID_LENGTH);
  });

  it('should default user ID to null', () => {
    const identity = new DefaultIdentity();
    expect(identity.getUserId()).toBeNull();
  });

  it('should allow user ID to be set', () => {
    const identity = new DefaultIdentity();
    identity.setUserId(USER_ID);
    expect(identity.getUserId()).toBe(USER_ID);
  });

  it('should allow user ID to be reset', () => {
    const identity = new DefaultIdentity();
    identity.setUserId(USER_ID);
    identity.setUserId(null);

    expect(identity.getUserId()).toBeNull();
  });
});
