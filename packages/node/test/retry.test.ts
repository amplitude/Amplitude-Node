import { TestRetry, MOCK_RETRY_TIMEOUTS } from './mocks/retry';
import { MockTransport } from './mocks/transport';
import { Event, Status, Response, Options } from '@amplitude/types';
import { asyncSleep, logger } from '@amplitude/utils';
import { BASE_RETRY_TIMEOUT_DEPRECATED_WARNING } from '../src/constants';

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

describe('default retry mechanisms', () => {
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

  it('should call onRetry lifecycle callback after retries', async () => {
    const onRetry = jest.fn();
    const { retry } = generateRetryHandler(null, {
      onRetry,
      retryTimeouts: [50, 100, 200],
    });
    const payload = [generateEvent(FAILING_USER_ID)];

    const response = await retry.sendEventsWithRetry(payload);

    // Sleep and wait for retries to end
    await asyncSleep(1000);
    expect(onRetry.mock.calls).toHaveLength(3);
    // Test retryTimeoutsIndex
    expect(onRetry.mock.calls[0][0]).toBe(response);
    expect(onRetry.mock.calls[1][0]).toBe(response);
    expect(onRetry.mock.calls[2][0]).toBe(response);

    expect(onRetry.mock.calls[0][1]).toBe(0);
    expect(onRetry.mock.calls[1][1]).toBe(1);
    expect(onRetry.mock.calls[2][1]).toBe(2);

    expect(onRetry.mock.calls[0][2]).toBe(false);
    expect(onRetry.mock.calls[1][2]).toBe(false);
    expect(onRetry.mock.calls[2][2]).toBe(true);
  });

  it('should not call onRetry lifecycle callback after successful sends', async () => {
    const onRetry = jest.fn();
    const { retry } = generateRetryHandler(null, {
      onRetry,
      retryTimeouts: [50, 100, 200],
    });
    const payload = [generateEvent(PASSING_USER_ID)];

    await retry.sendEventsWithRetry(payload);

    // Sleep and wait for retries to end
    await asyncSleep(500);
    expect(onRetry).not.toHaveBeenCalled();
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

  it('will convert deprecated options.maxRetries to options.retryTimeouts', () => {
    const loggerSpy = jest.spyOn(logger, 'warn');
    const { retry } = generateRetryHandler(null, { maxRetries: 3 });
    expect(loggerSpy).toHaveBeenCalledWith(BASE_RETRY_TIMEOUT_DEPRECATED_WARNING);
    expect(retry.getOptions().maxRetries).toBeUndefined();
    expect(retry.getOptions().retryTimeouts).toEqual([100, 200, 400]);
    loggerSpy.mockRestore();
  });

  it('will include the payload options key containing min_length_id if options.minLengthId is provided', () => {
    const minIdLength = 5;
    const { retry } = generateRetryHandler(undefined, { minIdLength });
    const payload = retry.getPayload([generateEvent(PASSING_USER_ID)]);
    expect(Object.keys(payload)).toEqual(['api_key', 'events', 'options']);
    expect(payload.options).toEqual({ min_id_length: minIdLength });
  });

  it('will NOT include the payload options key if options.minLengthId is null or undefined', () => {
    for (const minIdLength of [null, undefined]) {
      const { retry } = generateRetryHandler(undefined, { minIdLength });
      const payload = retry.getPayload([generateEvent(PASSING_USER_ID)]);
      expect(Object.keys(payload)).not.toContain('options');
      expect(payload.options).toBeUndefined();
    }
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

  it('should return NodeJS error in response during client side errors', async () => {
    const { transport, retry } = generateRetryHandler();
    const sendPayloadSpy = jest.spyOn(transport, 'sendPayload').mockImplementation(() => {
      class StubbedNodeError extends Error {
        errno: string;
        code: string;
        syscall: string;
        constructor() {
          super();
          this.errno = 'ENOTFOUND';
          this.code = 'ENOTFOUND';
          this.syscall = 'getaddrinfo';
        }
      }

      throw new StubbedNodeError();
    });

    const payload = [generateEvent(PASSING_USER_ID)];
    const response = await retry.sendEventsWithRetry(payload);

    expect(response.status).toBe(Status.SystemError);
    expect(response.statusCode).toBe(0);
    sendPayloadSpy.mockRestore();
  });
});
