import { logger, generateBase36Id } from '@amplitude/utils';

export class Identity {
  private _deviceId: string | null = null;
  private _userId: string | null = null;

  public initializeDeviceId(deviceId: string | null = null): string {
    const deviceIdToUse: string = deviceId == null ? generateBase36Id() : deviceId;

    if (this._deviceId == null) {
      this._deviceId = deviceIdToUse;
    } else {
      logger.warn('Cannot set device ID twice for same identity. Skipping operation.');
    }

    return this._deviceId;
  }

  public useAdvertisingIdForDeviceId() {
    throw Error('Not Implemented!');
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
    this._userId = userId;
  }

  public getUserId(): string | null {
    return this._userId;
  }
}
