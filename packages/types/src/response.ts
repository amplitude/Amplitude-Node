import { Status } from './status';

/** A response body for a request that returned 200 (successful). */
export type SuccessBody = {
  eventsIngested: number;
  payloadSizeBytes: number;
  serverUploadTime: number;
};

/** A response body for a request that returned 413 (invalid request). */
export type InvalidRequestBody = {
  error: string;
  missingField: string | null;
  eventsWithInvalidFields: { [eventField: string]: Array<number> };
  eventsWithMissingFields: { [eventField: string]: Array<number> };
};

/** A response body for a request that returned 413 (payload too large). */
export type PayloadTooLargeBody = {
  error: string;
};

/** A response body for a request that returned 429 (rate limit). */
export type RateLimitBody = {
  error: string;
  epsThreshold: number;
  throttledDevices: { [deviceId: string]: number };
  throttledUsers: { [userId: string]: number };
  exceededDailyQuotaDevices: { [deviceId: string]: number };
  exceededDailyQuotaUsers: { [userId: string]: number };
  throttledEvents: Array<number>;
};

export type StatusWithResponseBody = Status.Invalid | Status.PayloadTooLarge | Status.RateLimit | Status.Success;

/** Represents additional data that is provided by the http v2 API */
export type ResponseBody = SuccessBody | InvalidRequestBody | PayloadTooLargeBody | RateLimitBody;

/** JSDoc */
export type Response =
  | {
      status: Status.Success;
      statusCode: number;
      body?: SuccessBody;
    }
  | {
      status: Status.Invalid;
      statusCode: number;
      body?: InvalidRequestBody;
    }
  | {
      status: Status.PayloadTooLarge;
      statusCode: number;
      body?: PayloadTooLargeBody;
    }
  | {
      status: Status.RateLimit;
      statusCode: number;
      body?: RateLimitBody;
    }
  | {
      status: Exclude<Status, StatusWithResponseBody>;
      statusCode: number;
    };

/** The Response to expect if a request might have been sent but it was skipped
 *  e.g. no events to flush, user has opted out and nothing should be sent.
 */
export const SKIPPED_RESPONSE: Response = {
  status: Status.Skipped,
  statusCode: 0,
};
