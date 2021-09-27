import { logger } from './logger';
const MAX_PROPERTY_KEYS = 1000;

const _isValidObject = (properties: { [key: string]: any }): boolean => {
  if (Object.keys(properties).length > MAX_PROPERTY_KEYS) {
    logger.warn('too many properties. Skipping operation');
    return false;
  }
  for (const key in properties) {
    if (typeof key !== 'string') {
      logger.warn('invalid properties format. Skipping operation');
      return false;
    }
    const value = properties[key];
    if (!isValidProperties(key, value)) return false;
  }
  return true;
};

const isValidProperties = (property: string, value: any): boolean => {
  if (typeof property !== 'string') return false;
  if (Array.isArray(value)) {
    for (const valueElement of value) {
      if (Array.isArray(valueElement)) {
        logger.warn('invalid array element type ', typeof valueElement);
        return false;
      } else if (typeof valueElement === 'object') {
        return _isValidObject(value);
      } else if (!(typeof valueElement === 'number' || typeof valueElement === 'string') || !(typeof valueElement === 'boolean')) {
        logger.warn('invalid array element type ', typeof valueElement);
        return false;
      }
    }
  } else if (typeof value === 'object') {
    return _isValidObject(value);
  } else if (!(typeof value === 'number' || typeof value === 'string')) {
    logger.warn('invalid value type ', typeof value);
    return false;
  }
  return true;
};
export { isValidProperties };
