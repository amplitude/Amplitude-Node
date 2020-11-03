import { Response, ResponseBody, Status } from '@amplitude/types';
import { collectInvalidEventIndices } from '../src/response';

const BASE_RESPONSE_BODY: ResponseBody = {
  error: 'NOT_A_REAL_ERROR',
  missingField: 'MISSING_PAYLOAD_FIELD',
  eventsWithInvalidFields: {},
  eventsWithMissingFields: {},
};

const BASE_RESPONSE: Response = {
  status: Status.Invalid,
  statusCode: 400,
  body: BASE_RESPONSE_BODY,
};

describe('response utils: collecting invalid responses', () => {
  it('should not collect responses from non-invalid responses', () => {
    // Type cast because this isn't actually allowed in our typing
    const response: Response = {
      ...BASE_RESPONSE,
      status: Status.Success,
    } as any;

    const invalidEvents = collectInvalidEventIndices(response);
    expect(invalidEvents).toStrictEqual([]);
  });

  it('should collect responses from invalid fields', () => {
    const response: Response = {
      ...BASE_RESPONSE,
      body: {
        ...BASE_RESPONSE_BODY,
        eventsWithInvalidFields: { EVENT_FIELD: [0, 1] },
      },
    };

    const invalidEvents = collectInvalidEventIndices(response);
    expect(invalidEvents).toStrictEqual([0, 1]);
  });

  it('should collect responses from missing fields', () => {
    const response: Response = {
      ...BASE_RESPONSE,
      body: {
        ...BASE_RESPONSE_BODY,
        eventsWithMissingFields: { EVENT_FIELD: [0, 2] },
      },
    };

    const invalidEvents = collectInvalidEventIndices(response);
    expect(invalidEvents).toStrictEqual([0, 2]);
  });
  it('should not duplicate event indices', () => {
    const response: Response = {
      ...BASE_RESPONSE,
      body: {
        ...BASE_RESPONSE_BODY,
        eventsWithMissingFields: { EVENT_FIELD: [0, 2, 2] },
      },
    };

    const invalidEvents = collectInvalidEventIndices(response);
    expect(invalidEvents).toStrictEqual([0, 2]);
  });

  it('should sort event indices', () => {
    const response: Response = {
      ...BASE_RESPONSE,
      body: {
        ...BASE_RESPONSE_BODY,
        eventsWithMissingFields: { EVENT_FIELD: [2, 0] },
      },
    };

    const invalidEvents = collectInvalidEventIndices(response);
    expect(invalidEvents).toStrictEqual([0, 2]);
  });
});
