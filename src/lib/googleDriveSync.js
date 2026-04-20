/**
 * Google Drive Sync Service
 * Handles OAuth2 authorization and File operations for database sync.
 */

import { getDb } from './db';
import { getConfiguracoes } from './storeDb';

const DRIVE_FILE_NAME = 'meu-orcamento-db.sqlite';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient = null;
let accessToken = null;

/**
 * Loads the Google Identity Services script.
 */
function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Authorizes the user and returns an access token.
 */
export async function authorize() {
  const config = await getConfiguracoes();
  const clientId = config.googleDriveClientId;

  if (!clientId) {
    throw new Error('Google Client ID não configurado nas configurações.');
  }

  await loadGisScript();

  return new Promise((resolve, reject) => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            reject(response);
          }
          accessToken = response.access_token;
          resolve(accessToken);
        },
      });

      // Request token without prompt if we already have one (not strictly necessary for POC)
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Searches for the database file on Google Drive.
 */
async function findFile() {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILE_NAME}' and trashed=false`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

/**
 * Uploads the current local database to Google Drive.
 */
export async function uploadDatabase() {
  if (!accessToken) await authorize();

  const db = getDb();
  // SQL.FS is global or attached to SQL object. In our db.js, it's not exported.
  // We need to access the filesystem. Let's assume we can get the data from the DB object if possible, 
  // or export FS from db.js.
  
  // Actually, absurd-sql stores data in IndexedDB. To get a consistent snapshot, 
  // we might need to use the export functionality of sql.js if available, 
  // but for absurd-sql, it's better to read from the VFS.
  
  // I will update db.js to export the FS or a getDatabaseBinary function.
  const { getDatabaseBinary } = await import('./db');
  const binaryData = await getDatabaseBinary();

  const existingFile = await findFile();
  const metadata = {
    name: DRIVE_FILE_NAME,
    mimeType: 'application/x-sqlite3',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', new Blob([binaryData], { type: 'application/x-sqlite3' }));

  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';

  if (existingFile) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
    method = 'PATCH';
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Erro ao enviar para o Drive: ${err.error?.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * Downloads the database from Google Drive and replaces the local one.
 * WARNING: This will overwrite local data and require a reload.
 */
export async function downloadDatabase() {
  if (!accessToken) await authorize();

  const existingFile = await findFile();
  if (!existingFile) {
    throw new Error('Arquivo de banco de dados não encontrado no Google Drive.');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Erro ao baixar arquivo do Drive.');
  }

  const binaryData = await response.arrayBuffer();
  
  const { overwriteDatabaseWithBinary } = await import('./db');
  await overwriteDatabaseWithBinary(new Uint8Array(binaryData));
  
  return true;
}

/**
 * Main sync function: For now, it just uploads (Backup).
 * Bidirectional sync is complex for SQLite, so we prioritize Backup/Restore.
 */
export async function syncDatabase() {
  try {
    await uploadDatabase();
    return "Sincronismo concluído com sucesso (Backup enviado).";
  } catch (error) {
    console.error('Sync Error:', error);
    throw error;
  }
}
