import { HTTPTransport } from '../../src/transports';
import { AMPLITUDE_SERVER_URL } from '../../src/constants';
import { Response } from '@amplitude/types';

export class TestTransport extends HTTPTransport {
  public constructor() {
    super({
      serverUrl: AMPLITUDE_SERVER_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public sendDummyPayload(): Promise<Response> {
    return this.sendPayload({
      api_key: 'NOT_A_REAL_API_KEY',
      events: [],
    });
  }
}
