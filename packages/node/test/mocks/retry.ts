import { RetryHandler } from '../../src/';
import { Transport, Payload, Status, Response } from '@amplitude/types';

// Reduce the retry limit in favor of faster tests
export const MOCK_MAX_RETRIES = 3;

export class MockThrottledTransport implements Transport {
  private _throttledId: string;
  // The number of payloads that got throttled
  public throttleCount: number = 0;
  // The number of payloads that did not get throttled
  public unthrottleCount: number = 0;
  public constructor(throttledId: string) {
    this._throttledId = throttledId;
  }

  public sendPayload(payload: Payload): Promise<Response> {
    const isMatch = payload.events.some(event => event.user_id === this._throttledId);
    if (isMatch) {
      this.throttleCount += 1;
      return Promise.resolve({ status: Status.RateLimit, statusCode: 429 });
    } else {
      this.unthrottleCount += 1;
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
