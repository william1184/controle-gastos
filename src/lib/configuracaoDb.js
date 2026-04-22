import { getDb, initDb } from './db';
import { encrypt, decrypt } from './cryptoUtils';

const CHAVES_SENSIVEIS = ['geminiApiKey', 'googleDriveClientId', 'googleDriveApiKey'];

export async function getConfig(key, userId = null) {
  await initDb();
  const db = getDb();
  
  let sql = "SELECT valor FROM configuracao WHERE chave = ? AND usuario_id IS NULL";
  let params = [key || ''];
  
  if (userId) {
    sql = "SELECT valor FROM configuracao WHERE chave = ? AND usuario_id = ?";
    params = [key || '', userId || null];
  }
  
  const res = db.exec(sql, params);
  if (!res[0] || res[0].values.length === 0) return null;
  
  try {
    let valor = JSON.parse(res[0].values[0][0]);
    if (CHAVES_SENSIVEIS.includes(key) && typeof valor === 'string') {
      valor = decrypt(valor);
    }
    return valor;

  } catch (e) {
    let valor = res[0].values[0][0];
    if (CHAVES_SENSIVEIS.includes(key) && typeof valor === 'string') {
      valor = decrypt(valor);
    }
    return valor;
  }
}

export async function setConfig(key, value, userId = null) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  let valorParaSalvar = value;
  if (CHAVES_SENSIVEIS.includes(key) && typeof value === 'string') {
    valorParaSalvar = encrypt(value);
  }
  
  const jsonValue = JSON.stringify(valorParaSalvar);
  
  const existing = await getConfig(key, userId || null);
  
  if (existing !== null) {
    if (userId) {
      db.run("UPDATE configuracao SET valor = ?, updated_at = ? WHERE chave = ? AND usuario_id = ?", [jsonValue, now, key, userId || null]);
    } else {
      db.run("UPDATE configuracao SET valor = ?, updated_at = ? WHERE chave = ? AND usuario_id IS NULL", [jsonValue, now, key]);
    }
  } else {
    db.run("INSERT INTO configuracao (chave, valor, usuario_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", [key, jsonValue, userId || null, now, now]);
  }


}

/**
 * Migration helper to move data from legacy store to structured config.
 */
export async function migrateLegacyConfigs() {
  await initDb();
  const db = getDb();
  
  const res = db.exec("SELECT key, value FROM store WHERE key = 'configuracoes'");
  if (res[0] && res[0].values.length > 0) {
    const config = JSON.parse(res[0].values[0][1]);
    
    // System-wide configs
    if (config.geminiApiKey) await setConfig('geminiApiKey', config.geminiApiKey);
    if (config.googleDriveClientId) await setConfig('googleDriveClientId', config.googleDriveClientId);
    if (config.googleDriveApiKey) await setConfig('googleDriveApiKey', config.googleDriveApiKey);
    if (config.googleDriveSyncEnabled !== undefined) await setConfig('googleDriveSyncEnabled', config.googleDriveSyncEnabled);
    
    // Default User preferences (as we don't know which user yet, we can set for global or for the first user)
    // For now, let's set as global defaults if no user is specified.
    if (config.moeda) await setConfig('moeda', config.moeda);
    if (config.formatoData) await setConfig('formatoData', config.formatoData);
    if (config.labels) await setConfig('labels', config.labels);
    
    console.log('Legacy configurations migrated to structured table.');
  }
}
