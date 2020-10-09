import { logger, generateBase36Id } from '@amplitude/utils';
import { Identity, IdentityListener } from '@amplitude/types';

export class DefaultIdentity implements Identity {
  private _deviceId: string | null = null;
  private _userId: string | null = null;
  private _identityListeners: Array<IdentityListener> = [];

  public static generateDefaultId = () => {
    return generateBase36Id();
  };

  /**
   * Initializes a device ID for this instance (or takes the one passed in).
   *
   * Trying to initialize twice is a no-op and will do nothing - device IDs should not change
   * in an instance. if you want to reset a device ID, use the identity manager's resetInstance
   *
   * @param   {string} deviceId An optional parameter to set the device ID to use.
   * @returns {string}          The device ID that will be used for this instance going forward.
   */
  public initializeDeviceId(deviceId: string = ''): string {
    // Only try to set the device ID if the deviceID is not already set.
    if (this._deviceId == null) {
      let deviceIdToUse: string = '';

      if (typeof deviceId === 'string' && deviceId.length > 0) {
        deviceIdToUse = deviceId;
      } else if (typeof deviceId === 'number') {
        // type safety - in case a number gets passed in.
        deviceIdToUse = String(deviceId);
      } else {
        deviceIdToUse = DefaultIdentity.generateDefaultId();
      }

      this._deviceId = deviceIdToUse;
      this._alertIdentityListeners();
    } else {
      logger.warn('Cannot set device ID twice for same identity. Skipping operation.');
    }

    return this._deviceId;
  }

  public getDeviceId(): string {
    if (this._deviceId == null) {
      logger.warn('Did not detect device ID; generating one for this instance.');

      return this.initializeDeviceId();
    } else {
      return this._deviceId;
    }
  }

  public setUserId(userId: string): void {
    if (typeof userId === 'string') {
      this._userId = userId;
    } else if (typeof userId === 'number') {
      // type safety - in case a number gets passed in
      this._userId = String(userId);
    } else {
      logger.warn('User ID did not have correct type. Skipping operation.');
      return;
    }

    this._alertIdentityListeners();
  }

  public getUserId(): string | null {
    return this._userId;
  }

  private _alertIdentityListeners(): void {
    if (this._deviceId == null) {
      // If there was no device ID, create one and let
      // initializeDeviceID re-alert this function
      this.initializeDeviceId();
    } else {
      for (let listener of this._identityListeners) {
        listener(this._deviceId, this._userId);
      }
    }
  }

  public addIdentityListener(...listeners: Array<IdentityListener>): void {
    this._identityListeners.push(...listeners);
  }

  public getIdentityListeners(): Array<IdentityListener> {
    // Return a copy of the listeners
    return Array.from(this._identityListeners);
  }
}
