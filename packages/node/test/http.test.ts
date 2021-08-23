import { HTTPTransport } from '../src';
import { AMPLITUDE_SERVER_URL, DEFAULT_OPTIONS } from '../src/constants';
import { Status } from '@amplitude/types';
import * as nock from 'nock';

const anyMatch = (): boolean => true;
describe('HTTPTransport tests', () => {
  afterEach(() => nock.cleanAll());

  describe('sendPayload tests', () => {
    const transportOptions = {
      serverUrl: DEFAULT_OPTIONS.serverUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const httpTransport = new HTTPTransport(transportOptions);

    it('should succeed under default settings (no timeout delay)', async () => {
      nock(AMPLITUDE_SERVER_URL)
        .post(anyMatch)
        .reply(200);

      const testPayload = {
        api_key: 'test',
        events: [],
      };
      const resp = await httpTransport.sendPayload(testPayload);
      expect(resp.status).toBe(Status.Success);
      expect(resp.statusCode).toBe(200);
    });

    it('should succeed when timeout limit is much greater than request delay', async () => {
      const delay = 10; // 10 milisecond request delay
      const timeoutLimit = 10000; // ten seconds allowed request delay

      nock(AMPLITUDE_SERVER_URL)
        .post(anyMatch)
        .delay(delay)
        .reply(200);

      const testPayload = {
        api_key: 'test',
        events: [],
      };
      const resp = await httpTransport.sendPayload(testPayload, timeoutLimit);
      expect(resp.status).toBe(Status.Success);
      expect(resp.statusCode).toBe(200);
    });

    it('should timeout if the request takes longer than the timeout period', async () => {
      const delay = 10; // 10 milisecond request delay
      const timeoutLimit = 1; // 1 milisecond allowed request delay

      nock(AMPLITUDE_SERVER_URL)
        .post(anyMatch)
        .delay(delay)
        .reply(200);

      const testPayload = {
        api_key: 'test',
        events: [],
      };
      const resp = await httpTransport.sendPayload(testPayload, timeoutLimit);
      expect(resp.status).toBe(Status.Timeout);
      expect(resp.statusCode).toBe(0);
    });

    it('test request timeout options are accepted', async () => {
      const transportOptions2 = {
        serverUrl: DEFAULT_OPTIONS.serverUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        requestTimeoutMillis: 15,
      };
      const httpTransport2 = new HTTPTransport(transportOptions2);

      const testPayload = {
        api_key: 'test',
        events: [],
      };

      const sendPayloadSpy = jest.spyOn(httpTransport2, 'sendPayload');
      await httpTransport2.sendPayload(testPayload, 15);

      expect(sendPayloadSpy).toHaveBeenCalledWith(testPayload, 15);
      sendPayloadSpy.mockRestore();
    });
  });
});
