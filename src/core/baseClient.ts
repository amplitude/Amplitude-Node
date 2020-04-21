import { Options } from '../models/options';
import { Client } from '../models/client';
import { Event } from '../models/event';

export abstract class BaseClient<O extends Options> implements Client<O> {
    /** Project Api Key */
    protected readonly _apiKey: String;

    /** Options for the client. */
    protected readonly _options: O;

    public constructor(apiKey: String, options: O) {
        this._apiKey = apiKey;
        this._options = options;
    }

    getOptions(): O {
        return this._options;
    }

    logEvent(event: Event): void {
        
    }
    
    flush(): void {
        throw new Error("Method not implemented.");
    }

}