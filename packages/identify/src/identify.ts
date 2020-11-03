import {
  SpecialEventType,
  IdentifyEvent,
  IdentifyOperation,
  IdentifyUserProperties,
  ValidPropertyType,
} from '@amplitude/types';
import { logger } from '@amplitude/utils';

// A special value used by this class when a value is not needed by identify
// Ex. for unset, we set $unset: { 'example_user_property': '-' }
export const UNSET_VALUE = '-';

export class Identify {
  private _hasClearAll: boolean = false;
  private _userPropertySet: Set<string> = new Set<string>();
  private _userProperties: IdentifyUserProperties = {};

  static warn(operation: IdentifyOperation, ...msgs: any[]): void {
    return logger.warn('On Identify operation ', operation, ': ', ...msgs);
  }

  public toEvent(): IdentifyEvent {
    return {
      event_type: SpecialEventType.IDENTIFY,
      user_properties: this._userProperties,
    };
  }

  public getUserProperties(): IdentifyUserProperties {
    const userPropertiesCopy: IdentifyUserProperties = {};
    const fields: Array<IdentifyOperation> = Object.keys(this._userProperties) as any;
    for (let field of fields) {
      if (field in this._userProperties) {
        userPropertiesCopy[field] = { ...this._userProperties[field] };
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
    this._safeSet(IdentifyOperation.PREINSERT, property, value);
    return this;
  }

  public preinsert(property: string, value: ValidPropertyType): Identify {
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
    this._hasClearAll = true;
    this._userProperties[IdentifyOperation.CLEAR_ALL] = UNSET_VALUE;

    return this;
  }

  private _safeSet(operation: IdentifyOperation, property: string, value: any): void {
    if (this._validate(operation, property, value)) {
      let userPropertyMap: any = this._userProperties[operation];
      if (!userPropertyMap) {
        userPropertyMap = {};
        this._userProperties[operation] = userPropertyMap;
      }

      userPropertyMap[property] = value;
      this._userPropertySet.add(property);
    }
  }

  private _validate(operation: IdentifyOperation, property: string, value: any): boolean {
    if (this._hasClearAll) {
      Identify.warn(operation, 'clear all already set. Skipping operation');
      return false;
    }

    if (typeof property !== 'string') {
      Identify.warn(operation, 'expected string for property but got: ', typeof property, '. Skipping operation');
    }

    if (this._userPropertySet.has(property)) {
      Identify.warn(operation, 'property ', property, ' already used. Skipping operation');
      return false;
    }

    if (!(operation in this._userProperties)) {
      this._userProperties[operation] = {};
    }

    if (operation === IdentifyOperation.ADD) {
      return typeof value === 'number';
    } else if (operation !== IdentifyOperation.UNSET && operation !== IdentifyOperation.REMOVE) {
      if (Array.isArray(value)) {
        for (let valueElement of value) {
          if (!(typeof valueElement === 'number' || typeof valueElement === 'string')) {
            Identify.warn(operation, 'invalid array element type ', typeof valueElement, '. Skipping operation');
            return false;
          }
        }
      } else {
        return !(typeof value === 'number' || typeof value === 'string');
      }
    }

    return true;
  }
}
