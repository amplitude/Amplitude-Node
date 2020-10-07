import { logger, generateBase36Id } from '@amplitude/utils';

export class Identity {
  private _deviceId: string | null = null;
  private _userId: string | null = null;

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
        deviceIdToUse = generateBase36Id();
      }

      this._deviceId = deviceIdToUse;
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
    }
  }

  public getUserId(): string | null {
    return this._userId;
  }
}
