import { Status } from './status';

export type SuccessBody = {
  code: 200;
  eventsIngested: number;
  payloadSizeBytes: number;
  serverUploadTime: number;
};

export type InvalidRequestBody = {
  code: 400;
  error: string;
  missingField: string;
  eventsWithInvalidFields: Array<number>;
  eventsWithMissingFields: Array<number>;
};

export type PayloadTooLargeBody = {
  code: 413;
  error: string;
};

export type RateLimitBody = {
  code: 429;
  error: string;
  epsThreshold: number;
  throttledDevices: { [deviceId: string]: number };
  throttledUsers: { [userId: string]: number };
  exceededDailyQuotaDevices: { [userId: string]: number };
  exceededDailyQuotaUsers: { [userId: string]: number };
  throttledEvents: Array<number>;
};

export type ResponseBody = SuccessBody | InvalidRequestBody | PayloadTooLargeBody | RateLimitBody;

export const mapJSONToResponse = (json: any): ResponseBody | null => {
  if (typeof json !== 'object') {
    return null;
  }

  switch (json.code) {
    case 200:
      return {
        code: 200,
        eventsIngested: json.events_ingested,
        payloadSizeBytes: json.payload_size_bytes,
        serverUploadTime: json.server_upload_time,
      };
    case 400:
      return {
        code: 400,
        error: json.error ?? '',
        missingField: json.missing_field,
        eventsWithInvalidFields: json.events_with_invalid_fields ?? [],
        eventsWithMissingFields: json.events_with_missing_fields ?? [],
      };
    case 413:
      return {
        code: 413,
        error: json.error ?? '',
      };
    case 429:
      return {
        code: 429,
        error: json.error ?? '',
        epsThreshold: json.eps_threshold,
        throttledDevices: json.throttled_devices ?? {},
        throttledUsers: json.throttled_users ?? {},
        exceededDailyQuotaDevices: json.exceeded_daily_quota_devices ?? {},
        exceededDailyQuotaUsers: json.exceeded_daily_quota_users ?? {},
        throttledEvents: json.throttled_events ?? [],
      };
    default:
      return null;
  }
};

/** JSDoc */
export interface Response {
  status: Status;
  statusCode: number;
  body?: ResponseBody;
}
