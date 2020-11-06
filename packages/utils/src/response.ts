import { Response, Status } from '@amplitude/types';
import { IncomingMessage } from 'http';
import { mapHttpCodeToStatus } from './status';

/**
 * Collects the invalid event indices off a HTTP API v2 response
 * and returns them in increasing order.
 *
 * @param response A Response from sending an event payload
 * @returns An concatenated array of indices
 */
export const collectInvalidEventIndices = (response: Response): number[] => {
  const invalidEventIndices = new Set<number>();
  if (response.status === Status.Invalid && response.body !== undefined) {
    const { eventsWithInvalidFields, eventsWithMissingFields } = response.body;
    Object.keys(eventsWithInvalidFields).forEach((field: string) => {
      const eventIndices = eventsWithInvalidFields[field] ?? [];
      eventIndices.forEach((index: number) => {
        invalidEventIndices.add(index);
      });
    });
    Object.keys(eventsWithMissingFields).forEach((field: string) => {
      const eventIndices = eventsWithMissingFields[field] ?? [];
      eventIndices.forEach((index: number) => {
        invalidEventIndices.add(index);
      });
    });
  }

  return Array.from(invalidEventIndices).sort((numberOne, numberTwo) => numberOne - numberTwo);
};

/**
 * Converts a http.IncomingMessage object into a Response object.
 *
 * @param httpRes The http response from the HTTP API.
 * @returns Response a nicely typed and cased response object.
 */
export const mapHttpMessageToResponse = (httpRes: IncomingMessage): Response => {
  const statusCode = httpRes.statusCode === undefined ? 0 : httpRes.statusCode;
  const status = mapHttpCodeToStatus(statusCode);

  return {
    status,
    statusCode,
  };
};

/**
 * Converts the response from the HTTP V2 API into a Response object.
 * Should be used only if we are pointed towards the v2 api.
 *
 * @param responseJSON The response body from the HTTP V2 API, as a JSON blob
 * @returns Response a nicely typed and cased response object.
 */
export const mapJSONToResponse = (responseJSON: any): Response | null => {
  if (typeof responseJSON !== 'object') {
    return null;
  }

  const status = mapHttpCodeToStatus(responseJSON.code);
  const statusCode = responseJSON.code;

  switch (status) {
    case Status.Success:
      return {
        status,
        statusCode,
        body: {
          eventsIngested: responseJSON.events_ingested,
          payloadSizeBytes: responseJSON.payload_size_bytes,
          serverUploadTime: responseJSON.server_upload_time,
        },
      };

    case Status.Invalid:
      return {
        status,
        statusCode,
        body: {
          error: responseJSON.error ?? '',
          missingField: responseJSON.missing_field ?? null,
          eventsWithInvalidFields: responseJSON.events_with_invalid_fields ?? {},
          eventsWithMissingFields: responseJSON.events_with_missing_fields ?? {},
        },
      };
    case Status.PayloadTooLarge:
      return {
        status,
        statusCode,
        body: {
          error: responseJSON.error ?? '',
        },
      };
    case Status.RateLimit:
      return {
        status,
        statusCode,
        body: {
          error: responseJSON.error ?? '',
          epsThreshold: responseJSON.eps_threshold,
          throttledDevices: responseJSON.throttled_devices ?? {},
          throttledUsers: responseJSON.throttled_users ?? {},
          exceededDailyQuotaDevices: responseJSON.exceeded_daily_quota_devices ?? {},
          exceededDailyQuotaUsers: responseJSON.exceeded_daily_quota_users ?? {},
          throttledEvents: responseJSON.throttled_events ?? [],
        },
      };
    default:
      return {
        status,
        statusCode,
      };
  }
};
