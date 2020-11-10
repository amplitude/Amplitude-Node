import { TestRetry, MOCK_RETRY_TIMEOUTS } from './mocks/retry';
import { MockTransport } from './mocks/transport';
import { Event, Status, Response, Options } from '@amplitude/types';
import { asyncSleep } from '@amplitude/utils';

const FAILING_USER_ID = 'data_monster';
const PASSING_USER_ID = 'node_monster';

const generateEvent = (userId: string): Event => {
  return {
    event_id: 0,
    user_id: userId,
    event_type: 'NOT_A_REAL_EVENT',
  };
};

const generateRetryHandler = (
  body: Response | null = null,
  options?: Partial<Options>,
): { transport: MockTransport; retry: TestRetry } => {
  const transport = new MockTransport(FAILING_USER_ID, body);
  const retry = new TestRetry(transport, options);

  return { transport, retry };
};

describe('retry mechanisms layer', () => {
  it('should not retry events that pass', async () => {
    const { transport, retry } = generateRetryHandler();
    const payload = [generateEvent(PASSING_USER_ID)];
    const response = await retry.sendEventsWithRetry(payload);

    expect(response.status).toBe(Status.Success);
    expect(response.statusCode).toBe(200);
    // One response goes out matching the initial send
    expect(transport.passCount).toBe(1);
  });

  it('should retry events that fail', async () => {
    const { transport, retry } = generateRetryHandler();
    const payload = [generateEvent(FAILING_USER_ID)];

    const response = await retry.sendEventsWithRetry(payload);

    // Sleep and wait for retries to end
    await asyncSleep(1000);

    expect(response.status).toBe(Status.RateLimit);
    expect(response.statusCode).toBe(429);
    // One response goes out matching the initial send, MOCK_RETRY_TIMEOUTS for the retry layer
    expect(transport.failCount).toBe(MOCK_RETRY_TIMEOUTS.length + 1);
  });

  it('will not throttle user ids that are not throttled', async () => {
    const { transport, retry } = generateRetryHandler();
    const payload = [generateEvent(FAILING_USER_ID), generateEvent(PASSING_USER_ID)];
    const response = await retry.sendEventsWithRetry(payload);

    // Sleep and wait for retries to end
    await asyncSleep(1000);

    // The initial send should return as a fail
    expect(response.status).toBe(Status.RateLimit);
    expect(response.statusCode).toBe(429);
    // One response goes out matching the initial send
    expect(transport.failCount).toBe(MOCK_RETRY_TIMEOUTS.length + 1);
    // One response goes out for the passing event not getting 'throttled'
    expect(transport.passCount).toBe(1);
  });

  it('will convert deprecated options.maxRetries to options.retryTimeouts', async () => {
    const { retry } = generateRetryHandler(null, { maxRetries: 3 });
    const payload = [generateEvent(FAILING_USER_ID), generateEvent(PASSING_USER_ID)];
    await retry.sendEventsWithRetry(payload);
    // Sleep and wait for retries to end
    await asyncSleep(1000);
    expect(retry.getOptions().maxRetries).toBeUndefined();
    expect(retry.getOptions().retryTimeouts).toEqual([100, 200, 400]);
  });

  describe('fast-stop mechanisms for payloads', () => {
    it('will not allow a events exceeding daily quota to be retried', async () => {
      const body: Response = {
        status: Status.RateLimit,
        statusCode: 429,
        body: {
          error: 'NOT_A_REAL_ERROR',
          epsThreshold: 0,
          throttledEvents: [],
          throttledDevices: {},
          throttledUsers: {},
          exceededDailyQuotaDevices: {},
          exceededDailyQuotaUsers: { [FAILING_USER_ID]: 100 },
        },
      };
      const { transport, retry } = generateRetryHandler(body);

      const payload = [generateEvent(FAILING_USER_ID)];
      const response = await retry.sendEventsWithRetry(payload);
      expect(response.status).toBe(Status.RateLimit);
      expect(response.statusCode).toBe(429);
      // One response goes out matching the initial send
      expect(transport.failCount).toBe(1);
    });
    it('will not allow a single event that failed to be retried', async () => {
      const body: Response = {
        status: Status.Invalid,
        statusCode: 400,
        body: {
          error: 'NOT_A_REAL_ERROR',
          missingField: null,
          eventsWithInvalidFields: {},
          eventsWithMissingFields: {},
        },
      };
      const { transport, retry } = generateRetryHandler(body);

      const payload = [generateEvent(FAILING_USER_ID)];
      const response = await retry.sendEventsWithRetry(payload);
      expect(response.status).toBe(Status.Invalid);
      expect(response.statusCode).toBe(400);
      // One response goes out matching the initial send
      expect(transport.failCount).toBe(1);
    });

    it('will not allow events with invalid fields to be retried', async () => {
      const body: Response = {
        status: Status.Invalid,
        statusCode: 400,
        body: {
          error: 'NOT_A_REAL_ERROR',
          missingField: null,
          eventsWithInvalidFields: { MISSING_EVENT_FIELD: [0, 1] },
          eventsWithMissingFields: {},
        },
      };
      const { transport, retry } = generateRetryHandler(body);

      const payload = [generateEvent(FAILING_USER_ID), generateEvent(FAILING_USER_ID)];
      const response = await retry.sendEventsWithRetry(payload);
      expect(response.status).toBe(Status.Invalid);
      expect(response.statusCode).toBe(400);
      // One response goes out matching the initial send
      expect(transport.failCount).toBe(1);
    });

    it('will not allow payloads with invalid fields to be retried', async () => {
      const body: Response = {
        status: Status.Invalid,
        statusCode: 400,
        body: {
          error: 'NOT_A_REAL_ERROR',
          missingField: 'MISSING_PAYLOAD_FIELD',
          eventsWithInvalidFields: {},
          eventsWithMissingFields: {},
        },
      };
      const { transport, retry } = generateRetryHandler(body);

      const payload = [generateEvent(FAILING_USER_ID), generateEvent(PASSING_USER_ID)];
      const response = await retry.sendEventsWithRetry(payload);
      expect(response.status).toBe(Status.Invalid);
      expect(response.statusCode).toBe(400);
      // One response goes out matching the initial send
      expect(transport.failCount).toBe(1);
    });
  });
});
