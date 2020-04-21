import { Event } from './models/event';
import { BaseClient } from './core/baseClient';
import { NodeOptions } from './nodeoptions';
import { OPTION_DEFAULT_SERVER_URL } from './models/options';

import * as https from 'https';
import { SDK_NAME, SDK_VERSION } from './version';

export class NaiveNodeClient extends BaseClient<NodeOptions> {    
  logEvent(event: Event): void {
    super.logEvent(event)
    this._annotateEvent(event)

    let payload = JSON.stringify({
        api_key: this._apiKey,
        events: [event]
    })

    const options = {
        hostname: this._options.serverUrl ?? OPTION_DEFAULT_SERVER_URL,
        port: 443,
        path: '/2/httpapi',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }

    const req = https.request(options, (response) => {
        response.on('data', (d) => {
          process.stdout.write(d)
        })
      })
      
    req.on('error', (error) => {
      console.log(`request response fail`)
      console.error(error)
    })
      
    req.write(payload)
    req.end()
  }

  _annotateEvent(event: Event): void {
    event.library = `${SDK_NAME}-${SDK_VERSION}`
  }
}

export class PowerNodeClient extends BaseClient<NodeOptions> {
  private _buffer: Event[] = []
  
  logEvent(event: Event): void {
    super.logEvent(event)
    this._annotateEvent(event)

    this._buffer.push(event)

    let bufferLimit: number = this._options.bufferSize ?? 50

    if (this._buffer.length >= bufferLimit) {
      // Reach the limit, flush the queue
      this.flush()
    }
  }

  flush(): void {
    let options = {
      hostname: this._options.serverUrl ?? OPTION_DEFAULT_SERVER_URL,
      port: 443,
      path: '/2/httpapi',
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      }
    }

    let payload = JSON.stringify({
      api_key: this._apiKey,
      events: this._buffer
    })

    let req = https.request(options, (response) => {
      response.on('data', (d) => {
        console.log(`[Amplitude Log] Succeed to send events`)
        process.stdout.write(d)
        this._buffer = []
      })
    })
    
    req.on('error', (error) => {
      console.log(`[Amplitude Error] Fail to send events`)
      console.error(error)
      let bufferLimit: number = this._options.bufferSize ?? 50

      // If request fails, size the buffer down to max if it overflows.
      if (this._buffer.length >= bufferLimit) {
        this._buffer.splice(this._buffer.length - bufferLimit, bufferLimit)
      }
    })
      
    req.write(payload)
    req.end()
  }

  _annotateEvent(event: Event): void {
    event.library = `${SDK_NAME}-${SDK_VERSION}`
  }
}