/** The status of an event. */
export enum Status {
  /** The status could not be determined. */
  Unknown = 'unknown',
  /** The event was skipped due to configuration or callbacks. */
  Skipped = 'skipped',
  /** The event was sent successfully. */
  Success = 'success',
  /** A user or device in the payload is currently rate limited and should try again later. */
  RateLimit = 'rate_limit',
  /** The sent payload was too large to be processed. */
  PayloadTooLarge = 'payload_too_large',
  /** The event could not be processed. */
  Invalid = 'invalid',
  /** A server-side error ocurred during submission. */
  Failed = 'failed',
}
// tslint:disable:completed-docs
// tslint:disable:no-unnecessary-qualifier no-namespace
export namespace Status {
  /**
   * Converts a HTTP status code into a {@link Status}.
   *
   * @param code The HTTP response status code.
   * @returns The send status or {@link Status.Unknown}.
   */
  export function fromHttpCode(code: number): Status {
    if (code >= 200 && code < 300) {
      return Status.Success;
    }

    if (code === 429) {
      return Status.RateLimit;
    }

    if (code === 413) {
      return Status.PayloadTooLarge;
    }

    if (code >= 400 && code < 500) {
      return Status.Invalid;
    }

    if (code >= 500) {
      return Status.Failed;
    }

    return Status.Unknown;
  }
}
