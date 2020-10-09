import { getGlobalAmplitudeNamespace, generateBase36Id, logger } from '@amplitude/utils';
import { Identity, IdentityListener, DEFAULT_IDENTITY_INSTANCE } from '@amplitude/types';

import { DefaultIdentity } from './identity';

class IdentityManager {
  private _instanceMap: Map<string, Identity> = new Map<string, Identity>();

  public getInstance(
    instanceName: string = DEFAULT_IDENTITY_INSTANCE,
    optionalFallbackIdentity: Identity | null = null,
  ): Identity {
    let identity = this._instanceMap.get(instanceName);
    if (identity == undefined) {
      identity = optionalFallbackIdentity !== null ? optionalFallbackIdentity : new DefaultIdentity();
      this._instanceMap.set(instanceName, identity);
    }

    return identity;
  }

  /**
   *  Resets an instance's identity.
   *  Warning: Use only if you are sure that future events should not be attributed to the same user.
   *  Previous user properties will be lost. New events will not appear in a the original user stream.
   */
  public resetInstance(
    instanceName: string = DEFAULT_IDENTITY_INSTANCE,
    optionalNewIdentity: Identity | null = null,
  ): void {
    const oldIdentity = this._instanceMap.get(instanceName);
    const oldListeners: Array<IdentityListener> = oldIdentity?.getIdentityListeners() || [];
    if (!oldIdentity) {
      logger.warn(`Did not find a identity to reset for ${instanceName}`);
    } else {
      this._instanceMap.delete(instanceName);
    }

    const newIdentity = optionalNewIdentity !== null ? optionalNewIdentity : new DefaultIdentity();
    this._instanceMap.set(instanceName, newIdentity);

    if (oldListeners.length > 0) {
      // Add the old listeners and proactively initialize the device ID
      // So that the listeners know that the device ID has been reset
      newIdentity.addIdentityListener(...oldListeners);
      newIdentity.initializeDeviceId(generateBase36Id());
    }
  }
}

const globalNamespace = getGlobalAmplitudeNamespace();

let identityManager: IdentityManager = globalNamespace.identityManager as IdentityManager;
if (!identityManager) {
  identityManager = new IdentityManager();
  globalNamespace.identityManager = identityManager;
}

export { identityManager };
