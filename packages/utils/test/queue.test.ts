import { AsyncQueue } from '../src/queue';
import { asyncSleep } from '../src/misc';

class PromiseHook {
  public lastPromiseTag: string | null = null;
  public processedPromises: string[] = [];

  public createPromise(promiseTag: string, sleepInMs = 0): () => Promise<string> {
    return async (): Promise<string> => {
      await asyncSleep(sleepInMs);
      this.lastPromiseTag = promiseTag;
      this.processedPromises.push(promiseTag);
      return await Promise.resolve(promiseTag);
    };
  }
}

describe('async queue utility', () => {
  it('should return the promise value', async () => {
    const promiseGenerator = async (): Promise<string> => {
      return await Promise.resolve('TEST_STRING');
    };
    const queue = new AsyncQueue();
    const res = await queue.addToQueue<string>(promiseGenerator);

    expect(res).toBe('TEST_STRING');
  });

  it('should process promises in order', async () => {
    // A closure for promises to access
    const hook = new PromiseHook();
    const queue = new AsyncQueue();

    const firstPromise = queue.addToQueue<string>(hook.createPromise('PROMISE_ONE'));
    const secondPromise = queue.addToQueue<string>(hook.createPromise('PROMISE_TWO'));

    expect(hook.lastPromiseTag).toBe(null);

    await firstPromise;
    expect(hook.lastPromiseTag).toBe('PROMISE_ONE');
    expect(hook.processedPromises).toStrictEqual(['PROMISE_ONE']);

    await secondPromise;
    expect(hook.lastPromiseTag).toBe('PROMISE_TWO');
    expect(hook.processedPromises).toStrictEqual(['PROMISE_ONE', 'PROMISE_TWO']);
  });

  it('should process older promises even if not awaited', async () => {
    // A closure for promises to access
    const hook = new PromiseHook();
    const queue = new AsyncQueue();

    const firstPromise = queue.addToQueue<string>(hook.createPromise('PROMISE_ONE'));
    const secondPromise = queue.addToQueue<string>(hook.createPromise('PROMISE_TWO'));

    expect(hook.lastPromiseTag).toBe(null);

    // At this point, both should have been processes
    // because the first promise was added first
    await secondPromise;
    expect(hook.lastPromiseTag).toBe('PROMISE_TWO');
    expect(hook.processedPromises).toStrictEqual(['PROMISE_ONE', 'PROMISE_TWO']);

    await firstPromise;
    expect(hook.lastPromiseTag).toBe('PROMISE_TWO');
    expect(hook.processedPromises).toStrictEqual(['PROMISE_ONE', 'PROMISE_TWO']);
  });

  it('should process promises even if one fails', async () => {
    // A closure for promises to access
    const hook = new PromiseHook();
    const queue = new AsyncQueue();

    let didError = false;
    const firstPromise = queue.addToQueue<string>(async () => await Promise.reject(new Error('PROMISE_ONE')));
    const secondPromise = queue.addToQueue<string>(hook.createPromise('PROMISE_TWO'));

    expect(hook.lastPromiseTag).toBe(null);

    try {
      await firstPromise;
    } catch (err) {
      expect(err.message).toBe('PROMISE_ONE');
      didError = true;
    }
    expect(didError).toBe(true);

    await secondPromise;
    expect(hook.lastPromiseTag).toBe('PROMISE_TWO');
    expect(hook.processedPromises).toStrictEqual(['PROMISE_TWO']);
  });
});
