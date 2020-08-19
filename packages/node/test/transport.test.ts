import { TestTransport } from './mocks/transport';
import { AMPLITUDE_SERVER_URL } from '../src/constants';
import { Status } from '@amplitude/types';
import * as nock from 'nock';

const anyMatch = () => true;
describe('http transport layer', () => {
  it('returns a success status', async () => {
    nock(AMPLITUDE_SERVER_URL)
      .post(anyMatch)
      .reply(200);

    const response = await new TestTransport().sendDummyPayload();

    expect(response.status).toBe(Status.Success);
    expect(response.statusCode).toBe(200);
  });

  it('returns a throttle status', async () => {
    nock(AMPLITUDE_SERVER_URL)
      .post(anyMatch)
      .reply(429);

    const response = await new TestTransport().sendDummyPayload();

    expect(response.status).toBe(Status.RateLimit);
    expect(response.statusCode).toBe(429);
  });

  it('returns an invalid status', async () => {
    nock(AMPLITUDE_SERVER_URL)
      .post(anyMatch)
      .reply(400);

    const response = await new TestTransport().sendDummyPayload();

    expect(response.status).toBe(Status.Invalid);
    expect(response.statusCode).toBe(400);
  });

  it('returns an failed status', async () => {
    nock(AMPLITUDE_SERVER_URL)
      .post(anyMatch)
      .reply(500);

    const response = await new TestTransport().sendDummyPayload();

    expect(response.status).toBe(Status.Failed);
    expect(response.statusCode).toBe(500);
  });

  it('returns an unknown status', async () => {
    nock(AMPLITUDE_SERVER_URL)
      .post(anyMatch)
      .reply(100);

    const response = await new TestTransport().sendDummyPayload();

    expect(response.status).toBe(Status.Unknown);
    expect(response.statusCode).toBe(100);
  });
});
