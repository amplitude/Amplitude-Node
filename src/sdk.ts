import { NaiveNodeClient } from './nodeClient';
import { NodeOptions } from './nodeoptions';

export function init(apiKey: String, options: NodeOptions = {}): NaiveNodeClient {
    var client = new NaiveNodeClient(apiKey, options)
    return client
}