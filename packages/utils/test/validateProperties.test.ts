import { isValidProperties } from '../src/validateProperties';
describe('isValidateProperties', () => {
  it('should pass on valid properties', () => {
    const validProperties = {
      keyForString: 'stringValue',
      keyForNumber: 123,
      keyForArray: ['test', 456, { arrayObjKey1: 'arrayObjValue1' }, false],
      keyForObj: {
        objKey1: 'objValue1',
        objKey2: 'objValue2',
      },
      keyForBoolean: false,
    };
    expect(isValidProperties('property', validProperties)).toBe(true);
  });

  it('should fail on invalid properties with function as value', () => {
    const testFunc = (): string => {
      return 'test';
    };
    const inValidProperties = {
      keyForFunct: testFunc,
    };
    expect(isValidProperties('property', inValidProperties)).toBe(false);
  });

  it('should fail on invalid properties with array nested in array', () => {
    const inValidProperties = ['item1', 123, ['subItem1', 'subItem2']];
    expect(isValidProperties('property', inValidProperties)).toBe(false);
  });

  it('should fail when any key is not string', () => {
    const validProperties = {
      keyForString: 'stringValue',
      keyForNumber: 123,
      keyForArray: ['test', 456, false],
      keyForObj: {
        objKey1: 'objValue1',
        objKey2: 'objValue2',
      },
      keyForBoolean: false,
    };
    expect(isValidProperties(1 as any, validProperties)).toBe(false);
  });
});
