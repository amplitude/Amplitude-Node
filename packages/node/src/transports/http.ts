import { Payload, Response, Status, Transport, TransportOptions } from '@amplitude/types';

import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

/**
 * Internal used interface for typescript.
 * @hidden
 */
export interface HTTPRequest {
  /**
   * Request wrapper
   * @param options These are {@see TransportOptions}
   * @param callback Callback when request is finished
   */
  request(
    options: http.RequestOptions | https.RequestOptions | string | url.URL,
    callback?: (res: http.IncomingMessage) => void,
  ): http.ClientRequest;
}

type RequestQueueObject = {
  callback: () => void;
  cancellingTimeout: NodeJS.Timeout | null;
};

/** Base Transport class implementation */
export class HTTPTransport implements Transport {
  /** The Agent used for corresponding transport */
  public module: HTTPRequest;

  protected _uploadInProgress: boolean = false;
  protected _requestQueue: Array<RequestQueueObject> = [];

  /** Create instance and set this.dsn */
  public constructor(public options: TransportOptions) {
    if (options.serverUrl.startsWith('http://')) {
      this.module = http;
    } else if (options.serverUrl.startsWith('https://')) {
      this.module = https;
    } else {
      throw new Error('Invalid server url');
    }
  }

  /**
   * @inheritDoc
   */
  public async sendPayload(payload: Payload): Promise<Response> {
    const call = () => this._sendWithModule(payload);

    // Queue up the
    return this._awaitUploadFinish(call, 200);
  }

  /** Returns a build request option object used by request */
  protected _getRequestOptions(): http.RequestOptions | https.RequestOptions {
    const headers = {
      ...this.options.headers,
    };

    const url = new URL(this.options.serverUrl);
    const options: {
      [key: string]: any;
    } = {
      headers,
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
    };

    return options;
  }

  // Awaits the finish of all requests that have been queued up before it
  // And will expire itself (reject the promise) after waiting limit ms
  // or never expire, if limit is not set
  private _awaitUploadFinish(callback: () => Promise<Response>, limit: number = 0): Promise<Response> {
    return new Promise((resolve, reject) => {
      const queueCallback = () => {
        this._uploadInProgress = true;
        try {
          resolve(callback());
        } catch (e) {
          reject(e);
        } finally {
          this._notifyUploadFinish();
        }
      };

      // If there is no upload in progress
      // Return immediately
      if (!this._uploadInProgress) {
        return queueCallback();
      }

      const requestObject: RequestQueueObject = {
        callback: queueCallback,
        cancellingTimeout: null,
      };
      this._requestQueue.push(requestObject);

      // If the limit exists, set a timeout to remove the callback and reject the promise
      if (limit > 0) {
        requestObject.cancellingTimeout = setTimeout(() => {
          const callBackIndex = this._requestQueue.findIndex(requestObj => {
            return requestObj.callback === queueCallback;
          });

          if (callBackIndex > -1 && callBackIndex < this._requestQueue.length) {
            this._requestQueue.splice(callBackIndex, 1);
          }

          reject();
        }, limit);
      }
    });
  }

  // Notify the oldest awaiting send that the transport is ready for another request
  private _notifyUploadFinish(): void {
    this._uploadInProgress = false;
    const oldestRequest = this._requestQueue.shift();
    if (oldestRequest) {
      if (oldestRequest.cancellingTimeout !== null) {
        // Clear the timeout where we try to remove the callback and reject the promise.
        clearTimeout(oldestRequest.cancellingTimeout);
      }
      oldestRequest.callback();
    }
  }

  /** JSDoc */
  protected async _sendWithModule(payload: Payload): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const req = this.module.request(this._getRequestOptions(), (res: http.IncomingMessage) => {
        const statusCode = res.statusCode === undefined ? 0 : res.statusCode;
        const status = Status.fromHttpCode(statusCode);

        res.setEncoding('utf8');

        resolve({ status: status, statusCode: statusCode });
        // Force the socket to drain
        res.on('data', () => {
          // Drain
        });
        res.on('end', () => {
          // Drain
        });
      });
      req.on('error', reject);
      req.end(JSON.stringify(payload));
    });
  }
}
