import { BaseEvent, SpecialEventType } from './base-event';

export enum IdentifyOperation {
  // Base Operations to set values
  SET = '$set',
  SET_ONCE = '$setOnce',

  // Operations around modifying existing values
  ADD = '$add',
  APPEND = '$append',
  PREPEND = '$prepend',
  REMOVE = '$remove',

  // Operations around appending values *if* they aren't present
  PREINSERT = '$preinsert',
  POSTINSERT = '$postinsert',

  // Operations around removing properties/values
  UNSET = '$unset',
  CLEAR_ALL = '$clearAll',
}

type BaseOperationConfig = {
  [key: string]: number | string | Array<string | number>;
};

export type IdentifyUserProperties = {
  // Add operations can only take numbers
  [IdentifyOperation.ADD]?: { [key: string]: number };

  // These don't actually read the key
  [IdentifyOperation.UNSET]?: { [key: string]: any };
  [IdentifyOperation.CLEAR_ALL]?: any;

  // These operations can take numbers, strings, or arrays of both.
  [IdentifyOperation.SET]?: BaseOperationConfig;
  [IdentifyOperation.SET_ONCE]?: BaseOperationConfig;
  [IdentifyOperation.APPEND]?: BaseOperationConfig;
  [IdentifyOperation.PREPEND]?: BaseOperationConfig;
  [IdentifyOperation.POSTINSERT]?: BaseOperationConfig;
  [IdentifyOperation.PREINSERT]?: BaseOperationConfig;
  [IdentifyOperation.REMOVE]?: BaseOperationConfig;
};

export interface IdentifyEvent extends BaseEvent {
  event_type: SpecialEventType.IDENTIFY;
  user_properties:
    | IdentifyUserProperties
    | {
        [key in Exclude<string, IdentifyOperation>]: any;
      };
}
