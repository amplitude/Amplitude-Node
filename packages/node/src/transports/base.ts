import { Event, Payload, Response, Status, Transport, TransportOptions } from '@amplitude/types';

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
export abstract class BaseTransport implements Transport {
  /** The Agent used for corresponding transport */
  public module?: HTTPRequest;

  public event?: Event;

  /** The Agent used for corresponding transport */
  public client?: http.Agent | https.Agent;

  /** Locks transport after receiving 429 response */
  private _disabledUntil: Date = new Date(Date.now());

  protected _uploadInProgress: Boolean = false;

  /** Create instance and set this.dsn */
  public constructor(public options: TransportOptions) {}

  sendPayload(_: Payload): PromiseLike<Response> {
    throw new Error(`Method not implemented.`);
  }

  /** Returns a build request option object used by request */
  protected _getRequestOptions(): http.RequestOptions | https.RequestOptions {
    const headers = {
      ...this.options.headers,
    };

    const options: {
      [key: string]: any;
    } = {
      agent: this.client,
      headers,
      method: 'POST',
    };

    return options;
  }

  /** JSDoc */
  protected async _sendWithModule(httpModule: HTTPRequest, payload: Payload): Promise<Response> {
    if (this._uploadInProgress) {
      return Promise.reject(new Error('Previous upload is in progress.'));
    }

    if (new Date(Date.now()) < this._disabledUntil) {
      return Promise.reject(new Error(`Transport locked till ${this._disabledUntil} due to too many requests.`));
    }

    return new Promise<Response>((resolve, reject) => {
      const req = httpModule.request(this._getRequestOptions(), (res: http.IncomingMessage) => {
        this._uploadInProgress = false;

        const statusCode = res.statusCode || 500;
        const status = Status.fromHttpCode(statusCode);

        res.setEncoding('utf8');

        if (status === Status.Success) {
          resolve({ status });
        } else {
          if (status === Status.RateLimit) {
            const now = Date.now();
            this._disabledUntil = new Date(now + 30 * 1000);
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
