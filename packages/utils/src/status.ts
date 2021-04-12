import { Status } from '@amplitude/types';

/**
 * Converts a HTTP status code into a {@link Status}.
 *
 * @param code The HTTP response status code.
 * @returns The send status or {@link Status.Unknown}.
 */
export function mapHttpCodeToStatus(code: number): Status {
  if (code >= 200 && code < 300) {
    return Status.Success;
  }

  if (code === 429) {
    return Status.RateLimit;
  }

  if (code === 413) {
    return Status.PayloadTooLarge;
  }

  if (code === 408) {
    return Status.Timeout;
  }

  if (code >= 400 && code < 500) {
    return Status.Invalid;
  }

  if (code >= 500) {
    return Status.Failed;
  }

  return Status.Unknown;
}
