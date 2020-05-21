/**
 * Options that you can choose to configure against the client.
 */
export interface Options {
  /**
   * Whether you opt out from sending events.
   */
  optOut?: boolean;

  /**
   * Set it if you are using proxy server.
   */
  serverUrl?: string;
}
