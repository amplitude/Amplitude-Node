import { TestRetry, MOCK_MAX_RETRIES } from './mocks/retry';
import * as nock from 'nock';
import { Event, Status } from '@amplitude/types';
import { asyncSleep } from '@amplitude/utils';

import { AMPLITUDE_SERVER_URL } from '../src/constants';

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
  // A helper that persistently listens to nock and returns the # of
  // times a user id has been included and hasn't been included.
  let nockHook = { matchPassCount: 0, matchFailCount: 0 };
  beforeEach(() => {
    // Responses with FAILING_USER_ID should fail
    nock(AMPLITUDE_SERVER_URL)
      .persist()
      .post(
        () => true,
        body => {
          const events: Array<Event> = body.events ?? [];
          const isMatch = events.some(event => event.user_id === FAILING_USER_ID);

          if (isMatch) {
            nockHook.matchPassCount += 1;
            return true;
          } else {
            nockHook.matchFailCount += 1;
            return false;
          }
        },
      )
      .reply(400);

    // Responses without FAILING_USER_ID should return successfully
    nock(AMPLITUDE_SERVER_URL)
      .persist()
      .post(
        () => true,
        body => {
          const events: Array<Event> = body.events ?? [];
          return !events.some(event => event.user_id === FAILING_USER_ID);
        },
      )
      .reply(200);
  });
  // After each test, remove any remaining mocks and reset the nock hook.
  afterEach(() => {
    nock.cleanAll();
    nockHook = {
      matchPassCount: 0,
      matchFailCount: 0,
    };
  });

  it('should not retry events that pass', async () => {
    const payload = [generateEvent(PASSING_USER_ID)];

    const retryHandler = new TestRetry();

    const response = await retryHandler.sendEventsWithRetry(payload);

    expect(response.status).toBe(Status.Success);
    expect(response.statusCode).toBe(200);
    // One response goes out matching the initial send
    expect(nockHook.matchFailCount).toBe(1);
  });

  it('should retry events that fail', async () => {
    const payload = [generateEvent(FAILING_USER_ID)];

    const retryHandler = new TestRetry();

    const response = await retryHandler.sendEventsWithRetry(payload);

    // Sleep and wait for retries to end
    await asyncSleep(1000);

    expect(response.status).toBe(Status.Invalid);
    expect(response.statusCode).toBe(400);
    // One response goes out matching the initial send, MOCK_MAX_RETRIES for the retry layer
    expect(nockHook.matchPassCount).toBe(MOCK_MAX_RETRIES + 1);
  });

  it('will not throttle user ids that are not throttled', async () => {
    const payload = [generateEvent(FAILING_USER_ID), generateEvent(PASSING_USER_ID)];
    const retryHandler = new TestRetry();
    const response = await retryHandler.sendEventsWithRetry(payload);

    // Sleep and wait for retries to end
    await asyncSleep(1000);

    // The initial send should return as a fail
    expect(response.status).toBe(Status.Invalid);
    expect(response.statusCode).toBe(400);
    // One response goes out matching the initial send
    expect(nockHook.matchPassCount).toBe(MOCK_MAX_RETRIES + 1);
    // One response goes out for the passing event not getting 'throttled'
    expect(nockHook.matchFailCount).toBe(1);
  });
});
