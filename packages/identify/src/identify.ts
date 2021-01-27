import {
  IdentifyEvent,
  IdentifyOperation,
  IdentifyUserProperties,
  ValidPropertyType,
  SpecialEventType,
} from '@amplitude/types';
import { logger } from '@amplitude/utils';

import { UNSET_VALUE, USER_IDENTIFY_OPERATIONS } from './constants';

// A specific helper for the identify field
const identifyWarn = (operation: IdentifyOperation, ...msgs: any[]): void => {
  return logger.warn('On Identify operation ', operation, ': ', ...msgs);
};

export class Identify {
  // The set of operations that have been added to this identify
  protected readonly _propertySet: Set<string> = new Set<string>();
  protected _properties: IdentifyUserProperties = {};

  /** Create a user identify event out of this identify */
  public identifyUser(userId: string, deviceId: string | null = null): IdentifyEvent {
    const identifyEvent: IdentifyEvent = {
      event_type: SpecialEventType.IDENTIFY,
      user_properties: this.getUserProperties(),
      user_id: userId,
    };

    if (deviceId !== null && deviceId.length > 0) {
      identifyEvent.device_id = deviceId;
    }

    return identifyEvent;
  }

  public getUserProperties(): IdentifyUserProperties {
    const userPropertiesCopy: IdentifyUserProperties = {};
    for (const field of USER_IDENTIFY_OPERATIONS) {
      if (field in this._properties) {
        userPropertiesCopy[field] = { ...this._properties[field] };
      }
    }

    return userPropertiesCopy;
  }

  public set(property: string, value: ValidPropertyType): Identify {
    this._safeSet(IdentifyOperation.SET, property, value);
    return this;
  }

  public setOnce(property: string, value: ValidPropertyType): Identify {
    this._safeSet(IdentifyOperation.SET_ONCE, property, value);
    return this;
  }

  public append(property: string, value: ValidPropertyType): Identify {
    this._safeSet(IdentifyOperation.APPEND, property, value);
    return this;
  }

  public prepend(property: string, value: ValidPropertyType): Identify {
    this._safeSet(IdentifyOperation.PREPEND, property, value);
    return this;
  }

  public postInsert(property: string, value: ValidPropertyType): Identify {
    this._safeSet(IdentifyOperation.POSTINSERT, property, value);
    return this;
  }

  public preInsert(property: string, value: ValidPropertyType): Identify {
    this._safeSet(IdentifyOperation.PREINSERT, property, value);
    return this;
  }

  public remove(property: string, value: ValidPropertyType): Identify {
    this._safeSet(IdentifyOperation.REMOVE, property, value);
    return this;
  }

  public add(property: string, value: number): Identify {
    this._safeSet(IdentifyOperation.ADD, property, value);
    return this;
  }

  public unset(property: string): Identify {
    this._safeSet(IdentifyOperation.ADD, property, UNSET_VALUE);
    return this;
  }

  public clearAll(): Identify {
    this._propertySet.add(IdentifyOperation.CLEAR_ALL);
    this._properties[IdentifyOperation.CLEAR_ALL] = UNSET_VALUE;

    return this;
  }

  private _safeSet(operation: IdentifyOperation, property: string, value: any): void {
    if (this._validate(operation, property, value)) {
      let userPropertyMap: any = this._properties[operation];
      if (userPropertyMap === undefined) {
        userPropertyMap = {};
        this._properties[operation] = userPropertyMap;
      }

      userPropertyMap[property] = value;
      this._propertySet.add(property);
    }
  }

  private _validate(operation: IdentifyOperation, property: string, value: any): boolean {
    if (this._propertySet.has(IdentifyOperation.CLEAR_ALL)) {
      identifyWarn(operation, 'clear all already set. Skipping operation');
      return false;
    }

    if (typeof property !== 'string') {
      identifyWarn(operation, 'expected string for property but got: ', typeof property, '. Skipping operation');
    }

    if (this._propertySet.has(property)) {
      identifyWarn(operation, 'property ', property, ' already used. Skipping operation');
      return false;
    }

    if (!(operation in this._properties)) {
      this._properties[operation] = {};
    }

    if (operation === IdentifyOperation.ADD) {
      return typeof value === 'number';
    } else if (operation !== IdentifyOperation.UNSET && operation !== IdentifyOperation.REMOVE) {
      if (Array.isArray(value)) {
        for (const valueElement of value) {
          if (!(typeof valueElement === 'number' || typeof valueElement === 'string')) {
            identifyWarn(operation, 'invalid array element type ', typeof valueElement, '. Skipping operation');
            return false;
          }
        }
      } else if (!(typeof value === 'number' || typeof value === 'string')) {
        identifyWarn(operation, 'invalid value type ', typeof value, '. Skipping operation');
        return false;
      }
    }

    return true;
  }
}
