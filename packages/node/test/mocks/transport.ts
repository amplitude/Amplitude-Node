import { HTTPTransport } from '../../src/transports';
import { AMPLITUDE_SERVER_URL } from '../../src/constants';
import { Transport, Payload, Status, Response } from '@amplitude/types';

// A Transport that *extends* the node js transport
// And only serves to provide convenience setting up HTTPTransport
// Should be used for testing
export class TestTransport extends HTTPTransport {
  public constructor() {
    super({
      serverUrl: AMPLITUDE_SERVER_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async sendDummyPayload(): Promise<Response> {
    return await this.sendPayload({
      api_key: 'NOT_A_REAL_API_KEY',
      events: [],
      options: {},
    });
  }
}

const DEFAULT_RESPONSE_BODY: Response = {
  status: Status.RateLimit,
  statusCode: 429,
  body: {
    error: 'NOT_A_REAL_ERROR',
    epsThreshold: 0,
    throttledDevices: {},
    throttledUsers: {},
    exceededDailyQuotaDevices: {},
    exceededDailyQuotaUsers: {},
    throttledEvents: [],
  },
};

// A mock transport that *implements* the Transport interface
// but does not actually send data. Used to support tests for *other* clases
// (e.g. retry handler)
export class MockTransport implements Transport {
  private readonly _failingId: string;
  private readonly _response: Response;
  // The number of payloads that got failed
  public failCount = 0;
  // The number of payloads that "passed" to the server
  public passCount = 0;
  public constructor(failingId: string, response: Response | null) {
    this._failingId = failingId;
    this._response = response ?? DEFAULT_RESPONSE_BODY;
  }

  public async sendPayload(payload: Payload): Promise<Response> {
    const isMatch = payload.events.some(event => event.user_id === this._failingId);
    if (isMatch) {
      this.failCount += 1;
      return Promise.resolve(this._response);
    } else {
      this.passCount += 1;
      return Promise.resolve({ status: Status.Success, statusCode: 200 });
    }
  }
}
