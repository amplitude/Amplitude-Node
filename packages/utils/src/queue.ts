interface QueueObject {
  callback: () => void;
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
      const queueCallback = (): void => {
        this._promiseInProgress = true;
        try {
          const promise = promiseGenerator();
          promise.then(resolve, reject);
        } catch (e) {
          reject(e);
        } finally {
          this._notifyUploadFinish();
        }
      };

      // If there is no promise in progress
      // Return immediately
      if (!this._promiseInProgress) {
        return queueCallback();
      }

      const queueObject: QueueObject = {
        callback: queueCallback,
        cancellingTimeout: null,
      };
      this._promiseQueue.push(queueObject);

      // If the limit exists, set a timeout to remove the callback and reject the promise
      if (limitInMs > 0) {
        this._addQueueTimeout(queueObject, limitInMs, reject);
      }
    });
  }

  private _addQueueTimeout(queueObject: QueueObject, limitInMs: number, callback: (error: Error) => void): void {
    queueObject.cancellingTimeout = setTimeout(() => {
      const callBackIndex = this._promiseQueue.indexOf(queueObject);

      if (callBackIndex > -1) {
        this._promiseQueue.splice(callBackIndex, 1);
      }

      callback(new Error());
    }, limitInMs);
  }

  // Notify the oldest awaiting promise that the queue is ready to process another promise
  private _notifyUploadFinish(): void {
    this._promiseInProgress = false;
    const oldestRequest = this._promiseQueue.shift();
    if (oldestRequest !== undefined) {
      if (oldestRequest.cancellingTimeout !== null) {
        // Clear the timeout where we try to remove the callback and reject the promise.
        clearTimeout(oldestRequest.cancellingTimeout);
      }
      oldestRequest.callback();
    }
  }
}
