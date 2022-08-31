import { NodeClient } from '../src/nodeClient';
import { AMPLITUDE_SERVER_URL } from '../src/constants';
import { Status } from '@amplitude/types';
import * as nock from 'nock';

describe('nodeClient behavior', () => {
  const API_KEY = 'API_KEY';

  describe('init', () => {
    test('should return options with getOptions', () => {
      const client = new NodeClient(API_KEY);

      expect(client.getOptions()).toBeDefined();
    });

    test('should have ingestion_metadata in options', () => {
      const sourceName = 'ampli';
      const sourceVersion = '2.0.0';
      const client = new NodeClient(API_KEY, {
        ingestionMetadata: {
          source_name: sourceName,
          source_version: sourceVersion,
        },
      });

      expect(client.getOptions()?.ingestionMetadata?.source_name).toEqual(sourceName);
      expect(client.getOptions()?.ingestionMetadata?.source_version).toEqual(sourceVersion);
    });
  });

  describe('logEvent', () => {
    const host = 'https://api2.amplitude.com';
    const path = '/2/httpapi';

    afterEach(() => nock.cleanAll());

    test('should send request with events', async () => {
      let requestBody = null;
      const scope = nock(host)
        .post(path, function(body) {
          requestBody = body;
          return body;
        })
        .reply(200);
      const sourceName = 'ampli';
      const sourceVersion = '2.0.0';
      const client = new NodeClient(API_KEY, {
        ingestionMetadata: {
          source_name: sourceName,
          source_version: sourceVersion,
        },
      });
      const response = await client.logEvent({
        event_type: 'Test Event',
        user_id: 'test@amplitude.com',
      });

      // validate sent request
      expect(host + path).toEqual(AMPLITUDE_SERVER_URL);
      expect(scope.isDone()).toEqual(true);
      expect(response.status).toEqual(Status.Success);
      expect(response.statusCode).toEqual(200);

      // validate event content
      expect((requestBody as any)?.events?.[0]?.ingestion_metadata?.source_name).toEqual(sourceName);
      expect((requestBody as any)?.events?.[0]?.ingestion_metadata?.source_version).toEqual(sourceVersion);
    });
  });
});
