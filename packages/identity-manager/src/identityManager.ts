import { getGlobalAmplitudeNamespace, AMPLITUDE_DEFAULT_INSTANCE } from '@amplitude/utils';
import { Identity } from './identity';

class IdentityManager {
  private _instanceMap: Map<string, Identity> = new Map<string, Identity>();

  public getInstance(instanceName: string = AMPLITUDE_DEFAULT_INSTANCE): Identity {
    let identity = this._instanceMap.get(instanceName);
    if (identity == undefined) {
      identity = new Identity();
      this._instanceMap.set(instanceName, identity);
    }

    return identity;
  }
}

const globalNamespace = getGlobalAmplitudeNamespace();

let identityManager: IdentityManager = globalNamespace.identityManager as IdentityManager;
if (!identityManager) {
  identityManager = new IdentityManager();
  globalNamespace.identityManager = identityManager;
}

export { identityManager };
