import { getGlobalAmplitudeNamespace, logger } from '@amplitude/utils';
import { Identity, DEFAULT_IDENTITY_INSTANCE } from '@amplitude/types';

import { DefaultIdentity } from './identity';

class IdentityManager {
  private _instanceMap: Map<string, Identity> = new Map<string, Identity>();

  public getInstance(instanceName: string = DEFAULT_IDENTITY_INSTANCE): Identity {
    let identity = this._instanceMap.get(instanceName);
    if (identity == undefined) {
      identity = new DefaultIdentity();
      this._instanceMap.set(instanceName, identity);
    }

    return identity;
  }

  /**
   *  Resets an instance's identity.
   *  Warning: Use only if you are sure that future events should not be attributed to the same user.
   *  Previous user properties will be lost. New events will not appear in a the original user stream.
   */
  public resetInstance(instanceName: string = DEFAULT_IDENTITY_INSTANCE): void {
    if (!this._instanceMap.has(instanceName)) {
      logger.warn(`Did not find a identity to reset for ${instanceName}`);
    } else {
      this._instanceMap.delete(instanceName);
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
