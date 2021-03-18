import { isValidProperties } from '../src/validateProperties';
describe('isValidateProperties', () => {
  it('should pass on valid properties', () => {
    const validProperties = {
      keyForString: 'stringValue',
      keyForNumber: 123,
      keyForArray: ['test', 456],
      keyForObj: {
        objKey1: 'objValue1',
        objKey2: 'objValue2',
      },
    };
    expect(isValidProperties('property', validProperties)).toBe(true);
  });

  it('should fail on invalid properties', () => {
    const testFunc = () => {
      return 'test';
    };
    const inValidProperties = {
      keyForFunct: testFunc,
    };
    expect(isValidProperties('property', inValidProperties)).toBe(false);
  });

  it('should fail when any key is not string', () => {
    const validProperties = {
      keyForString: 'stringValue',
      keyForNumber: 123,
      keyForArray: ['test', 456],
      keyForObj: {
        objKey1: 'objValue1',
        objKey2: 'objValue2',
      },
    };
    expect(isValidProperties(1 as any, validProperties)).toBe(false);
  });
});
