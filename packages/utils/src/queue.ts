interface QueueObject {
  // The callback used to start the promise
  startPromise: () => Promise<void>;
  // If the promise is meant to expire after some time, this is the associated Timeout
  // Meant to be canceled if the promise is started.
  cancellingTimeout: NodeJS.Timeout | null;
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
  public async addToQueue<T = any>(promiseGenerator: () => Promise<T>, limitInMs = 0): Promise<T> {
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
        cancellingTimeout: null,
      };
      this._promiseQueue.push(queueObject);

      // If the limit exists, set a timeout to remove the callback and reject the promise
      if (limitInMs > 0) {
        queueObject.cancellingTimeout = setTimeout(() => {
          const callBackIndex = this._promiseQueue.indexOf(queueObject);

          if (callBackIndex > -1) {
            this._promiseQueue.splice(callBackIndex, 1);
            reject(new Error());
          }
        }, limitInMs);
      }
    });
  }

  // Notify the oldest awaiting promise that the queue is ready to process another promise
  private _notifyUploadFinish(): void {
    this._promiseInProgress = false;
    const oldestPromise = this._promiseQueue.shift();
    if (oldestPromise !== undefined) {
      if (oldestPromise.cancellingTimeout !== null) {
        // Clear the timeout where we try to remove the callback and reject the promise.
        clearTimeout(oldestPromise.cancellingTimeout);
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      oldestPromise.startPromise();
    }
  }
}
