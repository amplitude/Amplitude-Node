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
  public module?: HTTPRequest;

  protected _uploadInProgress: Boolean = false;

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
    if (!this.module) {
      throw new Error('No module available in HTTPTransport');
    }
    return await this._sendWithModule(this.module, payload);
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

  /** JSDoc */
  protected async _sendWithModule(httpModule: HTTPRequest, payload: Payload): Promise<Response> {
    if (this._uploadInProgress) {
      return Promise.reject(new Error('Previous upload is in progress.'));
    }

    return new Promise<Response>((resolve, reject) => {
      const req = httpModule.request(this._getRequestOptions(), (res: http.IncomingMessage) => {
        this._uploadInProgress = false;

        const statusCode = res.statusCode == null ? 500 : res.statusCode;
        const status = Status.fromHttpCode(statusCode);

        res.setEncoding('utf8');

        if (status === Status.Success) {
          resolve({ status: status, statusCode: statusCode });
        } else {
          if (status === Status.RateLimit) {
            // TODO: Logic when throttling happens
          }
          let rejectionMessage = `HTTP Error (${statusCode})`;
          reject(new Error(rejectionMessage));
        }

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

      this._uploadInProgress = true;
    });
  }
}
