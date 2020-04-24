import { Client } from '../models/client';
import { Event } from '../models/event';
import { Options } from '../models/options';

/**
 * Base implementation for all JavaScript SDK clients.
 *
 * Call the constructor with the options specific to the client subclass.
 * To access these options later, use {@link Client.getOptions}.
 *
 * @example
 * class NodeClient extends BaseClient<NodeOptions> {
 *   public constructor(apiKey: String, options: NodeOptions) {
 *   }
 *
 *   // ...
 * }
 */
export abstract class BaseClient<O extends Options> implements Client<O> {
  /** Project Api Key */
  protected readonly _apiKey: string;

  /** Options for the client. */
  protected readonly _options: O;

  /**
   * Initializes this client instance.
   *
   * @param apiKey API key for your project
   * @param options options for the client
   */
  public constructor(apiKey: string, options: O) {
    this._apiKey = apiKey;
    this._options = options;
  }

  /**
   * @inheritDoc
   */
  public getOptions(): O {
    return this._options;
  }

  /**
   * @inheritDoc
   */
  public logEvent(event: Event): void {
    throw new Error(`Method not implemented. Event: ${JSON.stringify(event)}`);
  }

  /**
   * @inheritDoc
   */
  public flush(): void {
    throw new Error('Method not implemented.');
  }
}
