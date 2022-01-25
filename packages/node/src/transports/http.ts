import { Options, Payload, Response, Status, Transport, TransportOptions } from '@amplitude/types';
import { AsyncQueue, mapJSONToResponse, mapHttpMessageToResponse } from '@amplitude/utils';

import * as http from 'http';
import * as https from 'https';
import { REQUEST_TIMEOUT_MILLIS_DEFAULT } from '../constants';
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

  protected _uploadInProgress = false;
  protected _requestQueue: AsyncQueue = new AsyncQueue();

  /** Create instance and set this.dsn */
  public constructor(public options: TransportOptions) {
    this.options = options;
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
  public async sendPayload(payload: Payload, limitInMs?: number): Promise<Response> {
    const timeoutMS = limitInMs ?? this.options.requestTimeoutMillis ?? REQUEST_TIMEOUT_MILLIS_DEFAULT;
    const call = async (): Promise<Response> => await this._sendWithModule(payload, timeoutMS);

    // Queue up the call to send the payload.
    // Wait 10 seconds for each request in queue before removing it
    return await this._requestQueue.addToQueue(call);
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
      port: url.port,
      path: url.pathname,
    };

    return options;
  }

  /** JSDoc */
  protected async _sendWithModule(payload: Payload, limitInMs: number): Promise<Response> {
    return await new Promise<Response>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      const req = this.module.request(this._getRequestOptions(), (res: http.IncomingMessage) => {
        res.setEncoding('utf8');
        let rawData = '';
        // Collect the body data from the response
        res.on('data', (chunk: string) => {
          rawData += chunk;
        });
        // On completion, parse the data and resolve.
        res.on('end', () => {
          if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
          }
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
      // set timeout within promise so that it can resolve itself if time is exceeded
      if (limitInMs > 0) {
        timeoutId = setTimeout(() => {
          req.destroy();
          resolve({ status: Status.Timeout, statusCode: 0 });
        }, limitInMs);
      }
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
    requestTimeoutMillis: options.requestTimeoutMillis,
  };
  return new HTTPTransport(transportOptions);
};
