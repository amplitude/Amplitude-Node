import { Status } from './status';
import { IncomingMessage } from 'http';

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

export const mapJSONToResponse = (json: any): Response | null => {
  if (typeof json !== 'object') {
    return null;
  }

  const status = Status.fromHttpCode(json.code);
  const statusCode = json.code;

  switch (status) {
    case Status.Success:
      return {
        status,
        statusCode,
        body: {
          eventsIngested: json.events_ingested,
          payloadSizeBytes: json.payload_size_bytes,
          serverUploadTime: json.server_upload_time,
        },
      };

    case Status.Invalid:
      return {
        status,
        statusCode,
        body: {
          error: json.error ?? '',
          missingField: json.missing_field ?? null,
          eventsWithInvalidFields: json.events_with_invalid_fields ?? {},
          eventsWithMissingFields: json.events_with_missing_fields ?? {},
        },
      };
    case Status.PayloadTooLarge:
      return {
        status,
        statusCode,
        body: {
          error: json.error ?? '',
        },
      };
    case Status.RateLimit:
      return {
        status,
        statusCode,
        body: {
          error: json.error ?? '',
          epsThreshold: json.eps_threshold,
          throttledDevices: json.throttled_devices ?? {},
          throttledUsers: json.throttled_users ?? {},
          exceededDailyQuotaDevices: json.exceeded_daily_quota_devices ?? {},
          exceededDailyQuotaUsers: json.exceeded_daily_quota_users ?? {},
          throttledEvents: json.throttled_events ?? [],
        },
      };
    default:
      return {
        status,
        statusCode,
      };
  }
};

export const mapHttpMessageToResponse = (httpRes: IncomingMessage): Response => {
  const statusCode = httpRes.statusCode === undefined ? 0 : httpRes.statusCode;
  const status = Status.fromHttpCode(statusCode);

  return {
    status,
    statusCode,
  };
};

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
      status: Status.Skipped;
      statusCode: 0;
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
