<p align="center">
  <a href="https://amplitude.com" target="_blank" align="center">
    <img src="https://static.amplitude.com/lightning/46c85bfd91905de8047f1ee65c7c93d6fa9ee6ea/static/media/amplitude-logo-with-text.4fb9e463.svg" width="280">
  </a>
  <br />
</p>

[![npm version](https://badge.fury.io/js/%40amplitude%2Fidentify.svg)](https://badge.fury.io/js/%40amplitude%2Fidentify)

# General

Utility functions to build and interact with the [Identify API](https://developers.amplitude.com/docs/identify-api) with the Node SDK.
This is a builder library to help interface with creating Identify events.
These events help add user properties to users and devices in your analytics, and do not count towards the event volume.

To use this, create an Identify instance and use the provided functions to set properties, chaining along function calls:

```
import { Identify } from '@amplitude/identify'

const identify = new Identify();
identify
  .set('start_date', 'March 3rd')
  .add('num_clicks', 4)
  .unset('needs_to_activate')
```

Then, this can be used with the Node SDK to send an identify call.
Because identify calls are special events, there are two different ways to accomplish this:

```
import Amplitude from '@amplitude/node';

const client = Amplitude.init('YOUR_API_KEY');

// One way to call the identify
client.identify('USER_ID', 'DEVICE_ID', identify);
// Equivalent way to call identify
// Can also modify the identifyEvent directly here
const identifyEvent = identify.identifyUser('USER_ID', 'DEVICE_ID');
client.logEvent(identifyEvent);
```
## Compatibility with Amplitude-Javascript

This is **not** compatible with the Amplitude Javascript SDK (`amplitude-js`).
This package should not be used with that SDK, and the identify API provided there should **not** be used with the Node SDK.
There are plans to consolidate these incompatibilities
.
## Group Identify

This identify supports the `setGroup` function.
Any identify operation calls made on this object will **also** be treated as a group identify call.
Certain operations will not be transferred to the group properties (see the docs on the [Group Identify API](https://developers.amplitude.com/docs/group-identify-api) to see which properties are supported here).

To not associate a user with the group identify, you can also use the `identifyGroup` function to send `$groupIdentify`
events for a group.

## Clear All

Clear all will clear all user properties from the user and device on all events going forward.
**Use this carefully** and make sure this is something you want to do instead of creating a new user/device id.
When clear all is used on the identify builder, all other operations are canceled and no new operations can be added.
This is because clear all must be sent as its own identify object.
