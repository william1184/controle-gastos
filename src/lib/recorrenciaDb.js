import { getDb, initDb } from './db';

export async function addRecorrencia(recorrencia) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO recorrencia (descricao, frequencia, proxima_execucao, created_at)
    VALUES (?, ?, ?, ?)
  `, [recorrencia.descricao, recorrencia.frequencia, recorrencia.proxima_execucao, now]);
  
  const res = db.exec("SELECT last_insert_rowid()");
  return res[0].values[0][0];
}

export async function updateRecorrencia(id, recorrencia) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    UPDATE recorrencia 
    SET descricao = ?, frequencia = ?, proxima_execucao = ?, updated_at = ?
    WHERE id = ?
  `, [recorrencia.descricao, recorrencia.frequencia, recorrencia.proxima_execucao, now, id]);
}

export async function getRecorrenciaById(id) {
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT * FROM recorrencia WHERE id = ?", [id]);
  
  if (!res[0]) return null;
  const row = res[0].values[0];
  const obj = {};
  res[0].columns.forEach((col, i) => obj[col] = row[i]);
  return obj;
}

export async function deleteRecorrencia(id) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  db.run("UPDATE recorrencia SET deleted_at = ? WHERE id = ?", [now, id]);
}
