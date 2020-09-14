import { RetryHandler } from '../../src/';

// Reduce the retry limit in favor of faster tests
export const MOCK_MAX_RETRIES = 3;

export class TestRetry extends RetryHandler {
  public retryCount: Map<string, Map<string, number>> = new Map<string, Map<string, number>>();

  public constructor() {
    super('NOT_A_REAL_API_KEY', { maxRetries: MOCK_MAX_RETRIES });
  }
}
