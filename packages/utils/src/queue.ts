interface QueueObject {
  // The callback used to start the promise
  startPromise: () => Promise<void>;
}

/**
 * Helper utility that processes promises one by one in the order they arrive,
 * with an optional time-out value.
 */
export class AsyncQueue {
  private readonly _promiseQueue: QueueObject[] = [];
  private _promiseInProgress = false;

  // Awaits the finish of all promises that have been queued up before it
  // And will expire itself (reject the promise) after waiting limit ms
  // or never expire, if limit is not set
  public async addToQueue<T = any>(promiseGenerator: () => Promise<T>): Promise<T> {
    return await new Promise((resolve, reject) => {
      // The callback that will start the promise resolution
      const startPromise = async (): Promise<void> => {
        this._promiseInProgress = true;
        try {
          const resp = await promiseGenerator();
          resolve(resp);
        } catch (err) {
          reject(err);
        } finally {
          this._notifyUploadFinish();
        }
      };

      // If there is no promise in progress
      // Return immediately
      if (!this._promiseInProgress) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        startPromise();
        return;
      }

      const queueObject: QueueObject = {
        startPromise,
      };
      this._promiseQueue.push(queueObject);
    });
  }

  // Notify the oldest awaiting promise that the queue is ready to process another promise
  private _notifyUploadFinish(): void {
    this._promiseInProgress = false;
    const oldestPromise = this._promiseQueue.shift();
    if (oldestPromise !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      oldestPromise.startPromise();
    }
  }
}
