import * as https from 'https';
import { logger } from '@amplitude/utils';
import { Client, Event, Options } from '@amplitude/types';
import { SDK_NAME, SDK_VERSION, AMPLITUDE_API_PATH, DEFAULT_OPTIONS } from 'src/constants';

export class NodeClient implements Client<Options> {
  /** Project Api Key */
  protected readonly _apiKey: string;

  /** Options for the client. */
  protected readonly _options: Options;

  /**
   * Initializes this client instance.
   *
   * @param apiKey API key for your project
   * @param options options for the client
   */
  public constructor(apiKey: string, options: Partial<Options>) {
    this._apiKey = apiKey;
    this._options = Object.assign({}, DEFAULT_OPTIONS, options);
    this._setUpLogging();
  }

  /**
   * @inheritDoc
   */
  getOptions(): Options {
    return this._options;
  }

  /**
   * @inheritDoc
   */
  flush(): void {
    throw new Error('Method not implemented.');
  }

  /**
   * @inheritDoc
   */
  public logEvent(event: Event): void {
    if (this._options.optOut === true) {
      return;
    }

    this._annotateEvent(event);

    const payload = JSON.stringify({
      api_key: this._apiKey,
      events: [event],
    });

    const requestOptions = {
      hostname: this._options.serverUrl,
      path: AMPLITUDE_API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(requestOptions, res => {
      res.on('data', _ => {
        // Request finishes.
        // We currently don't have error handling or retry, but we will add it soon.
      });
    });

    req.on('error', error => {
      console.info('[Amplitude|Error] Event is not submitted.', error);
    });

    req.write(payload);
    req.end();
  }

  /** Add platform dependent field onto event. */
  private _annotateEvent(event: Event): void {
    event.library = `${SDK_NAME}/${SDK_VERSION}`;
    event.platform = 'Node.js';
  }

  private _setUpLogging(): void {
    if (this._options.debug || this._options.logLevel) {
      if (this._options.logLevel) {
        logger.enable(this._options.logLevel);
      } else {
        logger.enable();
      }
    }
  }
}
