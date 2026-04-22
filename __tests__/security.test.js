import { encrypt, decrypt } from '../src/lib/cryptoUtils';
import { setConfig, getConfig } from '../src/lib/configuracaoDb';

let mockDbStore = {};
const mockExec = jest.fn((sql, params) => {
  if (sql.startsWith('SELECT')) {
    const key = params[0];
    if (mockDbStore[key] !== undefined) {
       return [{ values: [[mockDbStore[key]]] }];
    }
    return [];
  }
  return [];
});
const mockRun = jest.fn((sql, params) => {
  if (sql.startsWith('INSERT')) {
     mockDbStore[params[0]] = params[1];
  } else if (sql.startsWith('UPDATE')) {
     mockDbStore[params[2]] = params[0];
  }
});

const mockDbInstance = {
  exec: mockExec,
  run: mockRun
};

jest.mock('../src/lib/db', () => ({
  initDb: jest.fn().mockResolvedValue(),
  getDb: jest.fn(() => mockDbInstance)
}));

describe('Security - Crypto Utilities', () => {
  it('should encrypt and decrypt correctly', () => {
    const secretMessage = "minha-chave-super-secreta-123";
    const encrypted = encrypt(secretMessage);
    
    expect(encrypted).not.toBe(secretMessage);
    expect(encrypted).not.toContain(secretMessage);
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secretMessage);
  });

  it('should handle empty strings', () => {
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });

  it('should fallback to original if decrypting non-base64', () => {
    const plainText = "texto-plano-legado";
    expect(decrypt(plainText)).toBe(plainText);
  });
});

describe('Security - Config DB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save sensitive keys encrypted', async () => {
    const apiKey = "AIzaSy_fake_api_key_for_test";
    await setConfig('geminiApiKey', apiKey);
    
    // Check what was passed to db.run
    const runCalls = mockDbInstance.run.mock.calls;
    expect(runCalls.length).toBeGreaterThan(0);
    
    // Find the insert/update call for geminiApiKey
    const call = runCalls.find(c => c[1].includes('geminiApiKey'));
    const savedJson = call[1][1]; // The jsonValue
    
    expect(savedJson).not.toContain(apiKey); // Ensure the plain text key is not in the JSON
    expect(JSON.parse(savedJson)).not.toBe(apiKey);
  });

  it('should decrypt sensitive keys when retrieving', async () => {
    const apiKey = "AIzaSy_fake_api_key_for_test";
    
    // We mock the store directly
    const encryptedValue = encrypt(apiKey);
    mockDbStore['geminiApiKey'] = JSON.stringify(encryptedValue);

    const retrieved = await getConfig('geminiApiKey');
    expect(retrieved).toBe(apiKey);
  });
  
  it('should not encrypt non-sensitive keys', async () => {
     const theme = "dark";
     await setConfig('theme_mode', theme);
     
     const call = mockDbInstance.run.mock.calls.find(c => c[1].includes('theme_mode'));
     const savedJson = call[1][1];
     
     expect(JSON.parse(savedJson)).toBe(theme);
  });
});
