import { getDb, initDb } from './db';

export async function getUsuarios(entidadeId) {
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT * FROM usuario WHERE entidade_id = ? AND deleted_at IS NULL", [entidadeId]);
  if (!res[0]) return [];
  
  return res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export async function addUsuario(usuario) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO usuario (nome, entidade_id, created_at)
    VALUES (?, ?, ?)
  `, [usuario.nome, usuario.entidade_id, now]);
  
  const res = db.exec("SELECT last_insert_rowid()");
  return res[0].values[0][0];
}

export async function updateUsuario(id, data) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    UPDATE usuario 
    SET nome = ?, updated_at = ?
    WHERE id = ?
  `, [data.nome, now, id]);
}

export async function deleteUsuario(id) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    UPDATE usuario 
    SET deleted_at = ?
    WHERE id = ?
  `, [now, id]);
}

export async function getActiveUsuario() {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem('activeUsuarioId');
  if (!id) return null;
  
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT * FROM usuario WHERE id = ?", [id]);
  if (!res[0]) return null;
  
  const row = res[0].values[0];
  const obj = {};
  res[0].columns.forEach((col, i) => obj[col] = row[i]);
  return obj;
}

export function setActiveUsuario(id) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('activeUsuarioId', id);
  }
}
