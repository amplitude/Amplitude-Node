import { SpecialEventType, IdentifyEvent, IdentifyOperation, IdentifyUserProperties } from '@amplitude/types';

export const UNSET_VALUE = '-';

export class Identify {
  private _hasClearAll: boolean = false;
  private _userPropertySet: Set<string> = new Set<string>();
  private _userProperties: IdentifyUserProperties = {};

  public toEvent(): IdentifyEvent {
    return {
      event_type: SpecialEventType.IDENTIFY,
      user_properties: this._userProperties,
    };
  }

  public set(property: string, value: string | number | Array<string | number>): Identify {
    if (this._validate(IdentifyOperation.SET, property, value)) {
      this._safeSet(IdentifyOperation.SET, property, value);
    }

    return this;
  }

  public setOnce(property: string, value: string | number | Array<string | number>): Identify {
    if (this._validate(IdentifyOperation.SET_ONCE, property, value)) {
      this._safeSet(IdentifyOperation.SET_ONCE, property, value);
    }

    return this;
  }

  public append(property: string, value: string | number | Array<string | number>): Identify {
    if (this._validate(IdentifyOperation.APPEND, property, value)) {
      this._safeSet(IdentifyOperation.APPEND, property, value);
    }

    return this;
  }

  public prepend(property: string, value: string | number | Array<string | number>): Identify {
    if (this._validate(IdentifyOperation.PREPEND, property, value)) {
      this._safeSet(IdentifyOperation.PREPEND, property, value);
    }

    return this;
  }

  public postInsert(property: string, value: string | number | Array<string | number>): Identify {
    if (this._validate(IdentifyOperation.PREINSERT, property, value)) {
      this._safeSet(IdentifyOperation.PREINSERT, property, value);
    }

    return this;
  }

  public preinsert(property: string, value: string | number | Array<string | number>): Identify {
    if (this._validate(IdentifyOperation.PREINSERT, property, value)) {
      this._safeSet(IdentifyOperation.PREINSERT, property, value);
    }

    return this;
  }

  public remove(property: string, value: string | number | Array<string | number>): Identify {
    if (this._validate(IdentifyOperation.REMOVE, property, value)) {
      this._safeSet(IdentifyOperation.REMOVE, property, value);
    }

    return this;
  }

  public add(property: string, value: number): Identify {
    if (this._validate(IdentifyOperation.ADD, property, value)) {
      this._safeSet(IdentifyOperation.ADD, property, value);
    }

    return this;
  }

  public unset(property: string): Identify {
    if (this._validate(IdentifyOperation.UNSET, property, UNSET_VALUE)) {
      this._safeSet(IdentifyOperation.ADD, property, UNSET_VALUE);
    }

    return this;
  }

  public clearAll(): Identify {
    this._hasClearAll = true;
    this._userProperties[IdentifyOperation.CLEAR_ALL] = UNSET_VALUE;

    return this;
  }

  private _safeSet(operation: IdentifyOperation, property: string, value: any = null): void {
    let userPropertyMap: any = this._userProperties[operation];
    if (!userPropertyMap) {
      userPropertyMap = {};
      this._userProperties[operation] = userPropertyMap;
    }

    userPropertyMap[property] = value;
    this._userPropertySet.add(property);
  }

  private _validate(operation: IdentifyOperation, property: string, value: any): boolean {
    if (this._hasClearAll) {
      return false;
    }

    if (this._userPropertySet.has(property)) {
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
