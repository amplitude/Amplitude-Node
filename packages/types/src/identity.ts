/** The default identity instance. Needs to match the default instance for the JS SDK */
export const DEFAULT_IDENTITY_INSTANCE = '$default_instance';

export type IdentityListener = (deviceId: string, userId: string | null) => any;

/**
 * An interface for Amplitude to query the identity associated with a certain instance.
 * For Amplitude, identities consist of a user and a device ID.
 */
export interface Identity {
  /** Create a default and random device ID and set the identity's device ID */
  initializeDeviceId(optionalInitialDeviceId?: string): string;

  /** Get the device ID of identity, if it exists */
  getDeviceId(): string;

  /** Set the User ID of this identity */
  setUserId(newUserId?: string | null): void;

  /** Get the User ID of the identity, if it exists */
  getUserId(): string | null;

  addIdentityListener(...listeners: Array<IdentityListener>): any;
  getIdentityListeners(): Array<IdentityListener>;
}
