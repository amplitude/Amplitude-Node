import { initWithClient } from './core/sdk';
import { Client } from './models/client';
import { Options } from './models/options';
import { NodeClient } from './nodeClient';

/**
 * Internal function to create a new SDK client instance. The client is
 * installed and then bound to the current scope.
 *
 * @param apiKey API Key for project.
 * @param options Options to pass to the client.
 */
export function init(apiKey: string, options: Options = {}): Client {
  const nodeClient = initWithClient(apiKey, options, NodeClient);
  return nodeClient;
}
