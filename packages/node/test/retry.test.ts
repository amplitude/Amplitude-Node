import { TestRetry, MOCK_MAX_RETRIES } from './mocks/retry';
import { MockTransport } from './mocks/transport';
import { Event, Status, Response } from '@amplitude/types';
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

describe('retry mechanisms layer', () => {
  let transport = new MockTransport(FAILING_USER_ID, null);
  let retry = new TestRetry(transport);

  const setupRetry = (body: Response | null = null) => {
    transport = new MockTransport(FAILING_USER_ID, body);
    retry = new TestRetry(transport);
  };

  beforeEach(() => setupRetry());

  it('should not retry events that pass', async () => {
    const payload = [generateEvent(PASSING_USER_ID)];

    const response = await retry.sendEventsWithRetry(payload);

    expect(response.status).toBe(Status.Success);
    expect(response.statusCode).toBe(200);
    // One response goes out matching the initial send
    expect(transport.passCount).toBe(1);
  });

  it('should retry events that fail', async () => {
    const payload = [generateEvent(FAILING_USER_ID)];
    const response = await retry.sendEventsWithRetry(payload);

    // Sleep and wait for retries to end
    await asyncSleep(1000);

    expect(response.status).toBe(Status.RateLimit);
    expect(response.statusCode).toBe(429);
    // One response goes out matching the initial send, MOCK_MAX_RETRIES for the retry layer
    expect(transport.failCount).toBe(MOCK_MAX_RETRIES + 1);
  });

  it('will not throttle user ids that are not throttled', async () => {
    const payload = [generateEvent(FAILING_USER_ID), generateEvent(PASSING_USER_ID)];
    const response = await retry.sendEventsWithRetry(payload);

    // Sleep and wait for retries to end
    await asyncSleep(1000);

    // The initial send should return as a fail
    expect(response.status).toBe(Status.RateLimit);
    expect(response.statusCode).toBe(429);
    // One response goes out matching the initial send
    expect(transport.failCount).toBe(MOCK_MAX_RETRIES + 1);
    // One response goes out for the passing event not getting 'throttled'
    expect(transport.passCount).toBe(1);
  });

  describe('fast-stop mechanisms for payloads', () => {
    it('will not allow a events exceeding daily quota to be retried', async () => {
      const body: ResponseBody = {
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
      setupRetry(body);

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
      setupRetry(body);

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
          code: 400,
          error: 'NOT_A_REAL_ERROR',
          missingField: null,
          eventsWithInvalidFields: { MISSING_EVENT_FIELD: [0, 1] },
          eventsWithMissingFields: {},
        },
      };

      setupRetry(body);

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
      setupRetry(body);

      const payload = [generateEvent(FAILING_USER_ID), generateEvent(PASSING_USER_ID)];
      const response = await retry.sendEventsWithRetry(payload);
      expect(response.status).toBe(Status.Invalid);
      expect(response.statusCode).toBe(400);
      // One response goes out matching the initial send
      expect(transport.failCount).toBe(1);
    });
  });
});
