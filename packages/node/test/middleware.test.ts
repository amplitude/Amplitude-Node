import { MiddlewareRunner } from '../src/middleware/middlewareRunner';
import { MiddlewarePayload } from '@amplitude/types';

const PAYLOAD_EVENT_ONLY = { event: { event_type: 'Test ' } };

describe('middleware behavior', () => {
  let next: jest.Mock;
  let runner: MiddlewareRunner;

  beforeEach(() => {
    next = jest.fn();
    runner = new MiddlewareRunner();
  });

  it('should call next() with no middleware', () => {
    runner.run(PAYLOAD_EVENT_ONLY, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(PAYLOAD_EVENT_ONLY);
  });

  it('should call next() with single middleware', () => {
    const middleware = jest.fn((payload, next) => {
      next(payload);
    });

    runner.add(middleware);
    runner.run(PAYLOAD_EVENT_ONLY, next);

    expect(middleware).toHaveBeenCalledTimes(1);
    expect(middleware.mock.calls[0][0]).toEqual(PAYLOAD_EVENT_ONLY);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(PAYLOAD_EVENT_ONLY);
  });

  it('should not call next() with blocking middleware', () => {
    // Middlware doesn't call next, stops the chain
    const middleware = jest.fn();

    runner.add(middleware);
    runner.run(PAYLOAD_EVENT_ONLY, next);

    expect(middleware).toHaveBeenCalledTimes(1);
    expect(middleware.mock.calls[0][0]).toEqual(PAYLOAD_EVENT_ONLY);

    expect(next).toHaveBeenCalledTimes(0);
  });

  it('should run middleware in order', () => {
    const middlewareCount = 10;
    const middleware = [];
    const getPayloadWithCount = (count: number): MiddlewarePayload => ({
      event: { event_type: 'Test' },
      extra: { count },
    });

    // Create a number of middleware, each one increments the extra.count
    for (let i = 0; i < middlewareCount; i += 1) {
      middleware[i] = jest.fn((payload, next) => {
        let { count = 0 } = { ...payload.extra };
        count = +count + 1;
        next({ ...payload, extra: { count } });
      });
    }

    // Add middleware to run
    for (let i = 0; i < middlewareCount; i += 1) {
      runner.add(middleware[i]);
    }
    // Run with payload with count = 0
    runner.run(getPayloadWithCount(0), next);

    // Check all middleware was called
    for (let i = 0; i < middlewareCount; i += 1) {
      expect(middleware[i]).toHaveBeenCalledTimes(1);
      expect(middleware[i].mock.calls[0][0]).toEqual(getPayloadWithCount(i));
    }

    // Check call order
    for (let i = 0; i < middlewareCount; i += 1) {
      const nextMethod = i < middlewareCount - 1 ? middleware[i + 1] : next;
      expect(middleware[i].mock.invocationCallOrder[0]).toBeLessThan(nextMethod.mock.invocationCallOrder[0]);
    }

    // Check next function call
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(getPayloadWithCount(middlewareCount));
  });
});
