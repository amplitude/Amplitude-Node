/**
 * Options that you can choose to configure against the client.
 */
export interface Options {
  /**
   * Whether you opt out from sending events.
   */
  optOut?: boolean;

  /** The maximum events in the buffer */
  maxaCachedEvents?: number;

  /** If you're using a proxy server, set the network protocal it's using. (http or https) */
  serverProtocal?: string;

  /** If you're using a proxy server, set its host name. */
  serverHost?: string;

  /** If you're using a proxy server, set its path. */
  serverPath?: string;
}
