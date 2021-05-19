import {
  IdentifyEvent,
  IdentifyOperation,
  IdentifyUserProperties,
  ValidPropertyType,
  SpecialEventType,
} from '@amplitude/types';
import { logger, generateBase36Id, isValidProperties } from '@amplitude/utils';

import { UNSET_VALUE, USER_IDENTIFY_OPERATIONS, GROUP_IDENTIFY_OPERATIONS } from './constants';

// A specific helper for the identify field
const identifyWarn = (operation: IdentifyOperation, ...msgs: any[]): void => {
  return logger.warn('On Identify operation ', operation, ': ', ...msgs);
};

export class Identify {
  // The set of operations that have been added to this identify
  protected readonly _propertySet: Set<string> = new Set<string>();
  protected _properties: IdentifyUserProperties = {};
  protected _groups: { [groupName: string]: string } = {};

  /** Create a user identify event out of this identify */
  public identifyUser(userId: string | null, deviceId: string | null = null): IdentifyEvent {
    const identifyEvent: IdentifyEvent = {
      event_type: SpecialEventType.IDENTIFY,
      groups: { ...this._groups },
      user_properties: this.getUserProperties(),
    };

    let hasUserId = false;
    let hasDeviceId = false;

    if (typeof userId === 'string' && userId.length > 0) {
      hasUserId = true;
      identifyEvent.user_id = userId;
    }

    if (typeof deviceId === 'string' && deviceId.length > 0) {
      hasDeviceId = true;
      identifyEvent.device_id = deviceId;
    }

    if (!hasUserId && !hasDeviceId) {
      logger.warn(
        'Creating identify event without device or user ID - this event will be rejected unless one is attached',
      );
    }

    return identifyEvent;
  }

  public identifyGroup(groupName: string, groupValue: string): IdentifyEvent {
    const identifyEvent: IdentifyEvent = {
      event_type: SpecialEventType.GROUP_IDENTIFY,
      groups: { [groupName]: groupValue },
      user_properties: this.getGroupUserProperties(),
      device_id: generateBase36Id(), // Generate a throw-away, non-colliding ID
    };

    return identifyEvent;
  }

  protected getUserProperties(): IdentifyUserProperties {
    const userPropertiesCopy: IdentifyUserProperties = {};
    for (const field of USER_IDENTIFY_OPERATIONS) {
      if (field in this._properties) {
        userPropertiesCopy[field] = this._properties[field];
      }
    }

    return userPropertiesCopy;
  }

  protected getGroupUserProperties(): IdentifyUserProperties {
    const userPropertiesCopy: IdentifyUserProperties = {};
    for (const field of GROUP_IDENTIFY_OPERATIONS) {
      if (field in this._properties) {
        userPropertiesCopy[field] = this._properties[field];
      }
    }

    return userPropertiesCopy;
  }

  public setGroup(groupName: string, groupValue: string): Identify {
    const isSuccessfulSet = this._safeSet(IdentifyOperation.SET, groupName, groupValue);
    if (isSuccessfulSet) {
      this._groups[groupName] = groupValue;
    }

    return this;
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
    this._safeSet(IdentifyOperation.UNSET, property, UNSET_VALUE);
    return this;
  }

  public clearAll(): Identify {
    // When clear all happens, all properties are unset. Reset the entire object.
    this._properties = {};
    this._properties[IdentifyOperation.CLEAR_ALL] = UNSET_VALUE;

    return this;
  }

  // Returns whether or not this set actually worked.
  private _safeSet(operation: IdentifyOperation, property: string, value: any): boolean {
    if (this._validate(operation, property, value)) {
      let userPropertyMap: any = this._properties[operation];
      if (userPropertyMap === undefined) {
        userPropertyMap = {};
        this._properties[operation] = userPropertyMap;
      }

      userPropertyMap[property] = value;
      this._propertySet.add(property);
      return true;
    }

    return false;
  }

  private _validate(operation: IdentifyOperation, property: string, value: any): boolean {
    if (this._properties[IdentifyOperation.CLEAR_ALL] !== undefined) {
      identifyWarn(operation, 'clear all already set. Skipping operation');
      return false;
    }

    if (this._propertySet.has(property)) {
      identifyWarn(operation, 'property ', property, ' already used. Skipping operation');
      return false;
    }

    if (operation === IdentifyOperation.ADD) {
      return typeof value === 'number';
    } else if (operation !== IdentifyOperation.UNSET && operation !== IdentifyOperation.REMOVE) {
      return isValidProperties(property, value);
    }
    return true;
  }
}
