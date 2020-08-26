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

/** Base Transport class implementation */
export class HTTPTransport implements Transport {
  /** The Agent used for corresponding transport */
  public module: HTTPRequest;

  protected _uploadInProgress: boolean = false;
  protected _requestQueue: Array<() => void> = [];

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
    return this._sendWithModule(this.module, payload);
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
  private _awaitUploadFinish(limit: number = 0): Promise<void> {
    if (!this._uploadInProgress) {
      this._uploadInProgress = true;

      return Promise.resolve<void>(undefined);
    }

    return new Promise((resolve, reject) => {
      const callback = () => {
        this._uploadInProgress = true;
        resolve();
      };

      this._requestQueue.push(callback);

      if (limit > 0) {
        setTimeout(() => {
          const callBackIndex = this._requestQueue.indexOf(callback);

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
    if (this._requestQueue.length > 0) {
      const oldestAwaitingCallback = this._requestQueue.splice(0, 1)[0];
      oldestAwaitingCallback();
    }
  }

  /** JSDoc */
  protected async _sendWithModule(httpModule: HTTPRequest, payload: Payload): Promise<Response> {
    if (this._uploadInProgress) {
      try {
        await this._awaitUploadFinish(200);
      } catch {
        return Promise.reject(new Error('Previous send is in progress'));
      }
    }

    return new Promise<Response>((resolve, reject) => {
      const req = httpModule.request(this._getRequestOptions(), (res: http.IncomingMessage) => {
        this._uploadInProgress = false;

        const statusCode = res.statusCode === undefined ? 0 : res.statusCode;
        const status = Status.fromHttpCode(statusCode);

        res.setEncoding('utf8');

        resolve({ status: status, statusCode: statusCode });
        this._notifyUploadFinish();

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
