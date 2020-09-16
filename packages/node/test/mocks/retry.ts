import { RetryHandler } from '../../src/';
import { Transport, Payload, Status, Response, ResponseBody } from '@amplitude/types';

// Reduce the retry limit in favor of faster tests
export const MOCK_MAX_RETRIES = 3;

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

export class MockThrottledTransport implements Transport {
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

export class TestRetry extends RetryHandler {
  public retryCount: Map<string, Map<string, number>> = new Map<string, Map<string, number>>();

  public constructor(transport: Transport) {
    super('NOT_A_REAL_API_KEY', {
      maxRetries: MOCK_MAX_RETRIES,
      transportClass: transport,
    });
  }
}
