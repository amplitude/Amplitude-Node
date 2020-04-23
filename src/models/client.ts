import { Event } from './event';
import { Options } from './options';

export interface Client<O extends Options = Options> {
  /** Return the current options */
  getOptions(): O;

  logEvent(event: Event): void;
  flush(): void;
}
