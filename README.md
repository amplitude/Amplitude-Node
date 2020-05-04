<p align="center">
  <a href="https://amplitude.com" target="_blank" align="center">
    <img src="https://static.amplitude.com/lightning/46c85bfd91905de8047f1ee65c7c93d6fa9ee6ea/static/media/amplitude-logo-with-text.4fb9e463.svg" width="280">
  </a>
  <br />
</p>

# Official Amplitude SDKs for Node
This is Amplitude Node.js SDK written in Typescript, the 1st backend SDK for Amplitude. Currently, it's in beta version, but we would like to hear your ideas too! At this moment, we keep it minimal and simple because we want to give more thoughts over different customers' needs. Modularization and flexiblity will be the main priorities for this SDK.

## Usage
JavaScript
```javascript
// ES5 Syntax
const Amplitude = require('@amplitude/node');
// ES6 Syntax
import * as Amplitude from '@amplitude/node';

var client = amplitude.init(<AMPLITUDE_API_KEY>);
client.logEvent({
  event_type: 'Node.js Event',
  user_id: 'datamonster@gmail.com',
  location_lat: 37.77,
  location_lng: -122.39,
  ip: '127.0.0.1',
});
```
TypeScript
```typescript
import * as Amplitude from '@amplitude/node';

const client = Amplitude.init(<AMPLITUDE_API_KEY>);

client.logEvent({
  event_type: 'Node.js Event',
  user_id: 'datamonster@gmail.com',
  location_lat: 37.77,
  location_lng: -122.39,
  ip: '127.0.0.1',
});
```

# Need Help? #
If you have any problems or issues over our SDK, feel free to create a github issue or submit a request on [Amplitude Help](https://help.amplitude.com/hc/en-us/requests/new).
