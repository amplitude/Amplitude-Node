import { RetryHandler } from '../../src/';
import { Transport } from '@amplitude/types';

// Reduce default retryTimeouts for faster tests
export const MOCK_RETRY_TIMEOUTS = [100, 100, 100];

export class TestRetry extends RetryHandler {
  public retryCount: Map<string, Map<string, number>> = new Map<string, Map<string, number>>();

  public constructor(transport: Transport) {
    super('NOT_A_REAL_API_KEY', {
      retryTimeouts: MOCK_RETRY_TIMEOUTS,
      transportClass: transport,
    });
  }
}
