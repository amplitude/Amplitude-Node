import { Response, Status } from '@amplitude/types';

/**
 * Collects the invalid event indices off a HTTP API v2 response
 * and returns them in increasing order.
 *
 * @param response A Response from sending an event payload
 * @returns An concatenated array of indices
 */
export const collectInvalidEventIndices = (response: Response): Array<number> => {
  const invalidEventIndices = new Set<number>();
  if (response.status === Status.Invalid && response.body) {
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

  return Array.from(invalidEventIndices).sort();
};
