import { Options } from '@amplitude/types';
import { NodeClient } from './clients/nodeClient';

/**
 * Internal function to create a new SDK client instance. The client is
 * installed and then bound to the current scope.
 *
 * @param apiKey API Key for project.
 * @param options Options to pass to the client.
 */
export function init(apiKey: string, options: Partial<Options> = {}): NodeClient {
  const nodeClient = new NodeClient(apiKey, options);
  return nodeClient;
}
