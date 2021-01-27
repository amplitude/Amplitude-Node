import { IdentifyOperation } from '@amplitude/types';

// A special value used by this class when a value is not needed by identify
// Ex. for unset, we set $unset: { 'example_user_property': '-' }
export const UNSET_VALUE = '-';

// The set of operations that are allowed on user identify
export const USER_IDENTIFY_OPERATIONS = [
  IdentifyOperation.SET,
  IdentifyOperation.SET_ONCE,
  IdentifyOperation.ADD,
  IdentifyOperation.APPEND,
  IdentifyOperation.PREPEND,
  IdentifyOperation.REMOVE,
  IdentifyOperation.PREINSERT,
  IdentifyOperation.POSTINSERT,
  IdentifyOperation.UNSET,
  IdentifyOperation.CLEAR_ALL,
];

// The set of operations that are allowed on group identify
export const GROUP_IDENTIFY_OPERATIONS = [
  IdentifyOperation.SET,
  IdentifyOperation.SET_ONCE,
  IdentifyOperation.ADD,
  IdentifyOperation.APPEND,
  IdentifyOperation.PREPEND,
  IdentifyOperation.UNSET,
];
