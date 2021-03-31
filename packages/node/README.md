<p align="center">
  <a href="https://amplitude.com" target="_blank" align="center">
    <img src="https://static.amplitude.com/lightning/46c85bfd91905de8047f1ee65c7c93d6fa9ee6ea/static/media/amplitude-logo-with-text.4fb9e463.svg" width="280">
  </a>
  <br />
</p>

[![npm version](https://badge.fury.io/js/%40amplitude%2Fnode.svg)](https://badge.fury.io/js/%40amplitude%2Fnode)

# Official Amplitude SDK for Node.js
This is Amplitude Node.js SDK written in Typescript, the 1st backend SDK for Amplitude. Currently, it's in beta version, but we would like to hear your ideas too! At this moment, we keep it minimal and simple because we want to give more thoughts over different customers' needs. Modularization and flexiblity will be the main priorities for this SDK.

## Installation and Quick Start
Please visit our :100:[Developer Center](https://developers.amplitude.com/docs/nodejs) for instructions on installing and using our the SDK.

## Node and JS SDK's

There might be confusion about the use case and motivations for building the Node SDK when we have a JS SDK.
The [Amplitude-Javascript](https://github.com/amplitude/Amplitude-JavaScript) SDK is meant to be run in browser environments and on client devices, resulting in very different designs and assumptions.
For example, the Javascript SDK contains functionality that interfaces specifically with Web APIs (e.g. `referrer` and UTM attribution information, `navigator.language`), and that it can store metadata in API's such as cookies and localStorage.
It also makes other assumptions, such as that there is only one active "identity" sending events at a time.

In contrast, the Node SDK is meant to be run in a Node environment, and kept as flexible and modular as possible as to accommodate the various different use cases it may be used in.
It makes fewer assumption on how many users it is processing and what is available.
Though we primarily foresee the Node SDK being used in server
environments, we would love to hear how you plan to use it!

## Retry Behavior

One of the important aspects and functionalities of the Node SDK is its **ability to retry event payloads that fail**.
Network requests can fail for a variety of reasons, and it is important that the SDK provides a layer of **robustness** and **correctness** when these failures happen.

By default, the Node SDK will retry events on loop after a short pause if it finds that a request has failed; however, this
strategy is not ideal for every use case. As such, you can provide your own `retryClass` that implements the exported `Retry` interface (currently a single `sendEventsWithRetry` function).
For example, there is a secondary `OfflineRetryHandler` that is meant for a more opinionated use case where network requests may not always be available for long periods of time:

```
import { init, OfflineRetryHandler } from "@amplitude/node"

const amplitudeClient = init('YOUR_API_KEY', { retryClass: new OfflineRetryHandler('YOUR_API_KEY') })
```

As well as a `BaseRetryHandler` that does **no** retrying at all but contains several helper functions to extend from.
## Need Help?
If you have any problems or issues over our SDK, feel free to [create a github issue](https://github.com/amplitude/Amplitude-Node/issues/new) or submit a request on [Amplitude Help](https://help.amplitude.com/hc/en-us/requests/new).
