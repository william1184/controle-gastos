import { authorize, uploadDatabase, downloadDatabase } from '../../src/lib/googleDriveSync';
import * as db from '../../src/lib/db';
import * as storeDb from '../../src/lib/storeDb';

// Mocking dependencies
jest.mock('../../src/lib/db');
jest.mock('../../src/lib/storeDb');

global.fetch = jest.fn();

describe('Google Drive Sync Service', () => {
  const mockAccessToken = 'mock-access-token';
  const mockClientId = 'mock-client-id';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock storeDb.getConfiguracoes
    storeDb.getConfiguracoes.mockResolvedValue({
      googleDriveClientId: mockClientId,
      googleDriveApiKey: 'mock-api-key'
    });

    // Mock GIS (Google Identity Services)
    global.google = {
      accounts: {
        oauth2: {
          initTokenClient: jest.fn().mockReturnValue({
            requestAccessToken: jest.fn().mockImplementation(({ callback }) => {
              // Simulated callback with token
              const mockResponse = { access_token: mockAccessToken };
              // Accessing the callback from the initTokenClient args
              window.google.accounts.oauth2.initTokenClient.mock.calls[0][0].callback(mockResponse);
            })
          })
        }
      }
    };
  });

  test('authorize should request a token from Google', async () => {
    // GIS initialization is tricky to test fully with mocks, 
    // but we can verify it calls the store and then GIS
    const token = await authorize();
    expect(storeDb.getConfiguracoes).toHaveBeenCalled();
    expect(global.google.accounts.oauth2.initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: mockClientId })
    );
    expect(token).toBe(mockAccessToken);
  });

  test('uploadDatabase should search and then POST/PATCH to Drive', async () => {
    // 1. Mock authorize to avoid complex GIS testing again
    // (Already tested above, but for uploadDatabase we need accessToken)
    
    // 2. Mock findFile (search)
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ files: [] }) // File not found
    }));

    // 3. Mock binary data
    db.getDatabaseBinary.mockResolvedValue(new Uint8Array([1, 2, 3]));

    // 4. Mock upload (POST)
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ id: 'new-file-id' })
    }));

    const result = await uploadDatabase();
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('files?q=name'),
      expect.anything()
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('upload/drive/v3/files'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.id).toBe('new-file-id');
  });

  test('downloadDatabase should retrieve and overwrite local DB', async () => {
    // 1. Mock findFile (search) - found
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ files: [{ id: 'existing-file-id' }] })
    }));

    // 2. Mock download (GET alt=media)
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new Uint8Array([4, 5, 6]).buffer)
    }));

    const result = await downloadDatabase();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('existing-file-id?alt=media'),
      expect.anything()
    );
    expect(db.overwriteDatabaseWithBinary).toHaveBeenCalledWith(
      new Uint8Array([4, 5, 6])
    );
    expect(result).toBe(true);
  });
});
