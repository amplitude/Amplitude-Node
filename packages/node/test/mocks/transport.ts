import { HTTPTransport } from '../../src/transports';
import { AMPLITUDE_SERVER_URL } from '../../src/constants';
import { Transport, Payload, Status, Response, ResponseBody } from '@amplitude/types';

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

  public sendDummyPayload(): Promise<Response> {
    return this.sendPayload({
      api_key: 'NOT_A_REAL_API_KEY',
      events: [],
    });
  }
}

const DEFAULT_RESPONSE_BODY: ResponseBody = {
  code: 429,
  error: 'NOT_A_REAL_ERROR',
  epsThreshold: 0,
  throttledDevices: {},
  throttledUsers: {},
  exceededDailyQuotaDevices: {},
  exceededDailyQuotaUsers: {},
  throttledEvents: [],
};

// A mock transport that *implements* the Transposrt interface
// but does not actually send data. Used to support tests for *other* clases
// (e.g. retry handler)
export class MockTransport implements Transport {
  private _failingId: string;
  private _responseBody: ResponseBody;
  private _statusCode: number;
  private _status: Status;

  // The number of payloads that got failed
  public failCount: number = 0;
  // The number of payloads that "passed" to the server
  public passCount: number = 0;
  public constructor(failingId: string, response: ResponseBody | null) {
    this._failingId = failingId;
    this._responseBody = response ?? DEFAULT_RESPONSE_BODY;
    this._statusCode = this._responseBody.code;
    this._status = Status.fromHttpCode(this._statusCode);
  }

  public sendPayload(payload: Payload): Promise<Response> {
    const isMatch = payload.events.some(event => event.user_id === this._failingId);
    if (isMatch) {
      this.failCount += 1;
      return Promise.resolve({ status: this._status, statusCode: this._statusCode, body: this._responseBody });
    } else {
      this.passCount += 1;
      return Promise.resolve({ status: Status.Success, statusCode: 200 });
    }
  }
}
