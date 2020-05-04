import * as https from 'https';

import { BaseClient } from './core/baseClient';
import { Event } from './models/event';
import { OPTION_DEFAULT_SERVER_URL, Options } from './models/options';
import { SDK_NAME, SDK_VERSION } from './version';

export class NodeClient extends BaseClient<Options> {
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
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(this._options.serverUrl ?? OPTION_DEFAULT_SERVER_URL, requestOptions);

    req.on('error', error => {
      console.info('[Amplitude|Error] Event is not submitted.', error);
    });

    req.write(payload);
    req.end();
  }

  /** Add platform dependent field onto event. */
  private _annotateEvent(event: Event): void {
    event.library = `${SDK_NAME}-${SDK_VERSION}`;
    event.platform = 'Node.js';
  }
}
