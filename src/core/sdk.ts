import { Client } from '../models/client';
import { Options } from '../models/options';

/** A class object that can instanciate Client objects. */
export type ClientClass<F extends Client, O extends Options> = new (apiKey: String, options: O) => F;

/**
 * Internal function to create a new SDK client instance. The client is
 * installed and then bound to the current scope.
 *
 * @param apiKey API Key for project.
 * @param options Options to pass to the client.
 * @param clientClass The version of the client you want to use.
 */
export function initWithClient<F extends Client, O extends Options>(
  apiKey: string,
  options: O,
  clientClass: ClientClass<F, O>,
): Client {
  if (options.debug === true) {
    //
  }

  const client = new clientClass(apiKey, options);
  return client;
}
