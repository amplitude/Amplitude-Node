import { IdentifyOperation, SpecialEventType } from '@amplitude/types';
import { UNSET_VALUE } from '../src/constants';
import { Identify } from '../src/identify';

const USER_ID = 'MOCK_USER_ID';
const DEVICE_ID = 'MOCK_DEVICE_ID';

describe('Identify API', () => {
  it('should create an identify event with the correct top-level fields', () => {
    const identify = new Identify();
    const event = identify.identifyUser(USER_ID, DEVICE_ID);

    expect(event.device_id).toBe(DEVICE_ID);
    expect(event.user_id).toBe(USER_ID);
    expect(event.event_type).toBe(SpecialEventType.IDENTIFY);
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

  it('should see user property when using set', () => {
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
});
