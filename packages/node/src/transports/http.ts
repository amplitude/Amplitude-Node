import { Options, Payload, Response, Transport, TransportOptions } from '@amplitude/types';
import { mapJSONToResponse, mapHttpMessageToResponse } from '@amplitude/utils';

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

interface RequestQueueObject {
  callback: () => void;
  cancellingTimeout: NodeJS.Timeout | null;
}

// Automatially cancel requests that have been waiting for 10+ s
const REQUEST_CANCEL_TIMEOUT = 10 * 1000;

/** Base Transport class implementation */
export class HTTPTransport implements Transport {
  /** The Agent used for corresponding transport */
  public module: HTTPRequest;

  protected _uploadInProgress = false;
  protected _requestQueue: RequestQueueObject[] = [];

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
    const call = async (): Promise<Response> => await this._sendWithModule(payload);

    // Queue up the call to send the payload.
    // Wait 10 seconds for each request in queue before removing it
    return await this._awaitUploadFinish(call, REQUEST_CANCEL_TIMEOUT);
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
  private async _awaitUploadFinish(callback: () => Promise<Response>, limitInMs = 0): Promise<Response> {
    return await new Promise((resolve, reject) => {
      const queueCallback = (): void => {
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
      if (limitInMs > 0) {
        requestObject.cancellingTimeout = setTimeout(() => {
          const callBackIndex = this._requestQueue.findIndex(requestObj => {
            return requestObj.callback === queueCallback;
          });

          if (callBackIndex > -1) {
            this._requestQueue.splice(callBackIndex, 1);
          }

          reject(new Error(''));
        }, limitInMs);
      }
    });
  }

  // Notify the oldest awaiting send that the transport is ready for another request
  private _notifyUploadFinish(): void {
    this._uploadInProgress = false;
    const oldestRequest = this._requestQueue.shift();
    if (oldestRequest !== undefined) {
      if (oldestRequest.cancellingTimeout !== null) {
        // Clear the timeout where we try to remove the callback and reject the promise.
        clearTimeout(oldestRequest.cancellingTimeout);
      }
      oldestRequest.callback();
    }
  }

  /** JSDoc */
  protected async _sendWithModule(payload: Payload): Promise<Response> {
    return await new Promise<Response>((resolve, reject) => {
      const req = this.module.request(this._getRequestOptions(), (res: http.IncomingMessage) => {
        res.setEncoding('utf8');
        let rawData = '';
        // Collect the body data from the response
        res.on('data', (chunk: string) => {
          rawData += chunk;
        });
        // On completion, parse the data and resolve.
        res.on('end', () => {
          if (res.complete && rawData.length > 0) {
            try {
              const responseWithBody = mapJSONToResponse(JSON.parse(rawData));
              if (responseWithBody !== null) {
                return resolve(responseWithBody);
              }
            } catch {
              // pass
            }
          }

          // Fallback: get the response object directly from the incoming message
          resolve(mapHttpMessageToResponse(res));
        });
      });
      req.on('error', reject);
      req.end(JSON.stringify(payload));
    });
  }
}

export const setupDefaultTransport = (options: Options): Transport => {
  const transportOptions: TransportOptions = {
    serverUrl: options.serverUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  return new HTTPTransport(transportOptions);
};
