import { TestRetry, MOCK_MAX_RETRIES, MockThrottledTransport } from './mocks/retry';
import { Event, Status } from '@amplitude/types';
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

const setupRetry = () => {
  const transport = new MockThrottledTransport(FAILING_USER_ID);
  const retry = new TestRetry(transport);
  return {
    retry,
    transport,
  };
};

describe('retry mechanisms layer', () => {
  // A helper that persistently listens to nock and returns the # of
  // times a user id has been included and hasn't been included.

  let { transport, retry } = setupRetry();
  beforeEach(() => {
    // create new instances before each test
    const newObjects = setupRetry();
    transport = newObjects.transport;
    retry = newObjects.retry;
  });

  it('should not retry events that pass', async () => {
    const payload = [generateEvent(PASSING_USER_ID)];

    const response = await retry.sendEventsWithRetry(payload);

    expect(response.status).toBe(Status.Success);
    expect(response.statusCode).toBe(200);
    // One response goes out matching the initial send
    expect(transport.unthrottleCount).toBe(1);
  });

  it('should retry events that fail', async () => {
    const payload = [generateEvent(FAILING_USER_ID)];
    const response = await retry.sendEventsWithRetry(payload);

    // Sleep and wait for retries to end
    await asyncSleep(1000);

    expect(response.status).toBe(Status.RateLimit);
    expect(response.statusCode).toBe(429);
    // One response goes out matching the initial send, MOCK_MAX_RETRIES for the retry layer
    expect(transport.throttleCount).toBe(MOCK_MAX_RETRIES + 1);
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
    expect(transport.throttleCount).toBe(MOCK_MAX_RETRIES + 1);
    // One response goes out for the passing event not getting 'throttled'
    expect(transport.unthrottleCount).toBe(1);
  });
});
