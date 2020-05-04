/**
 * Options that you can choose to configure against the client.
 */
export interface Options {
  /**
   * Enable debug functionality in the SDK itself
   */
  debug?: boolean;

  /**
   * Whether this SDK should activate and send events to Amplitude.
   * Defaults to true.
   */
  enabled?: boolean;

  /**
   * Set it if you are using proxy server.
   */
  serverUrl?: string;
}

export const OPTION_DEFAULT_SERVER_URL = 'https://api.amplitude.com/2/httpapi';
