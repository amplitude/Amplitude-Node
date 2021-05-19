import { IdentifyOperation, SpecialEventType } from '@amplitude/types';
import { UNSET_VALUE } from '../src/constants';
import { Identify } from '../src/identify';

const USER_ID = 'MOCK_USER_ID';
const DEVICE_ID = 'MOCK_DEVICE_ID';
const GROUP_NAME = 'MOCK_GROUP_NAME';
const GROUP_VALUE = 'MOCK_GROUP_VALUE';

describe('Identify API', () => {
  it('should create an identify event with the correct top-level fields', () => {
    const identify = new Identify();
    const event = identify.identifyUser(USER_ID, DEVICE_ID);

    expect(event.device_id).toBe(DEVICE_ID);
    expect(event.user_id).toBe(USER_ID);
    expect(event.event_type).toBe(SpecialEventType.IDENTIFY);
  });

  it('should create an identify event even if user ID is null', () => {
    const identify = new Identify();
    const event = identify.identifyUser(null, DEVICE_ID);

    expect(event.device_id).toBe(DEVICE_ID);
    expect(event.user_id).toBe(null);
    expect(event.event_type).toBe(SpecialEventType.IDENTIFY);
  });

  it('should create an identify event even if device ID is null', () => {
    const identify = new Identify();
    const event = identify.identifyUser(USER_ID, null);

    expect(event.device_id).toBe(null);
    expect(event.user_id).toBe(USER_ID);
    expect(event.event_type).toBe(SpecialEventType.IDENTIFY);
  });

  it('should create a group identify event with the correct top-level fields', () => {
    const identify = new Identify();
    const event = identify.identifyGroup(GROUP_NAME, GROUP_VALUE);

    expect(event.device_id !== undefined).toBe(true);
    expect(event.user_id).toBe(undefined);
    expect(event.event_type).toBe(SpecialEventType.GROUP_IDENTIFY);
    expect(event.groups).toStrictEqual({ [GROUP_NAME]: GROUP_VALUE });
  });
  it('should see user property when using set', () => {
    const identify = new Identify();
    identify.set('PROPERTY_NAME', 'PROPERTY_VALUE');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);

    const expectedProperties = {
      [IdentifyOperation.SET]: { PROPERTY_NAME: 'PROPERTY_VALUE' },
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should see user property when using set once', () => {
    const identify = new Identify();
    identify.setOnce('PROPERTY_NAME', 'PROPERTY_VALUE');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);

    const expectedProperties = {
      [IdentifyOperation.SET_ONCE]: { PROPERTY_NAME: 'PROPERTY_VALUE' },
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should see user property when using add', () => {
    const identify = new Identify();
    identify.add('PROPERTY_NAME', 1);
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {
      [IdentifyOperation.ADD]: { PROPERTY_NAME: 1 },
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should see user property when using append', () => {
    const identify = new Identify();
    identify.append('PROPERTY_NAME', 'PROPERTY_VALUE');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {
      [IdentifyOperation.APPEND]: { PROPERTY_NAME: 'PROPERTY_VALUE' },
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should see user property when using prepend', () => {
    const identify = new Identify();
    identify.prepend('PROPERTY_NAME', 'PROPERTY_VALUE');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {
      [IdentifyOperation.PREPEND]: { PROPERTY_NAME: 'PROPERTY_VALUE' },
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should see user property when using post-insert', () => {
    const identify = new Identify();
    identify.postInsert('PROPERTY_NAME', 'PROPERTY_VALUE');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {
      [IdentifyOperation.POSTINSERT]: { PROPERTY_NAME: 'PROPERTY_VALUE' },
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should see user property when using pre-insert', () => {
    const identify = new Identify();
    identify.postInsert('PROPERTY_NAME', 'PROPERTY_VALUE');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {
      [IdentifyOperation.POSTINSERT]: { PROPERTY_NAME: 'PROPERTY_VALUE' },
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should see user property when using remove', () => {
    const identify = new Identify();
    identify.remove('PROPERTY_NAME', 'PROPERTY_VALUE');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {
      [IdentifyOperation.REMOVE]: { PROPERTY_NAME: 'PROPERTY_VALUE' },
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should see user property when using unset', () => {
    const identify = new Identify();
    identify.unset('PROPERTY_NAME');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {
      [IdentifyOperation.UNSET]: { PROPERTY_NAME: UNSET_VALUE },
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should see user property when using clear all', () => {
    const identify = new Identify();
    identify.clearAll();
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {
      [IdentifyOperation.CLEAR_ALL]: UNSET_VALUE,
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should allow multiple properties to be added', () => {
    const identify = new Identify();
    identify.set('PROPERTY_NAME', 'PROPERTY_VALUE');
    identify.set('PROPERTY_NAME_TWO', 1);
    identify.append('PROPERTY_NAME_THREE', 'PROPERTY_VALUE');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {
      [IdentifyOperation.SET]: {
        PROPERTY_NAME: 'PROPERTY_VALUE',
        PROPERTY_NAME_TWO: 1,
      },
      [IdentifyOperation.APPEND]: {
        PROPERTY_NAME_THREE: 'PROPERTY_VALUE',
      },
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should not allow non-string property names', () => {
    const identify = new Identify();
    // this should be ignored
    identify.set(3 as any, 'PROPERTY_VALUE');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {};

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should not set any new properties after clear all', () => {
    const identify = new Identify();
    identify.clearAll().set('PROPERTY_NAME', 'PROPERTY_VALUE');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {
      [IdentifyOperation.CLEAR_ALL]: UNSET_VALUE,
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should not set any properties twice', () => {
    const identify = new Identify();
    identify.set('PROPERTY_NAME', 'PROPERTY_VALUE');
    // these two should be ignored
    identify.set('PROPERTY_NAME', 1);
    identify.append('PROPERTY_NAME', 'PROPERTY_VALUE');
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {
      [IdentifyOperation.SET]: { PROPERTY_NAME: 'PROPERTY_VALUE' },
    };

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should not allow non-numeric add values', () => {
    const identify = new Identify();
    // this should be ignored
    identify.add('PROPERTY_NAME', 'PROPERTY_VALUE' as any);
    const event = identify.identifyUser(USER_ID, DEVICE_ID);
    const expectedProperties = {};

    expect(event.user_properties).toStrictEqual(expectedProperties);
  });

  it('should ignore group identify properties that are not supported', () => {
    const identify = new Identify();
    identify.remove('PROPERTY_NAME', 'PROPERTY_VALUE');
    identify.postInsert('PROPERTY_NAME', 'PROPERTY_VALUE');
    identify.preInsert('PROPERTY_NAME', 'PROPERTY_VALUE');
    const event = identify.identifyGroup(GROUP_NAME, GROUP_VALUE);

    expect(event.user_properties).toStrictEqual({});
  });
});
