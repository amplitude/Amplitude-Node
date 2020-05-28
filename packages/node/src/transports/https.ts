import { Payload, Response, TransportOptions } from '@amplitude/types';
import * as https from 'https';

import { BaseTransport } from './base';

/** Node https module transport */
export class HTTPSTransport extends BaseTransport {
  /** Create a new instance and set this.agent */
  public constructor(public options: TransportOptions) {
    super(options);
    this.module = https;
    this.client = new https.Agent({ keepAlive: false, maxSockets: 30, timeout: 2000 });
  }

  /**
   * @inheritDoc
   */
  public sendPayload(payload: Payload): Promise<Response> {
    if (!this.module) {
      throw new Error('No module available in HTTPTransport');
    }
    return this._sendWithModule(this.module, payload);
  }
}
