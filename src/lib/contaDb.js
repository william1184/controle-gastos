import { getDb, initDb } from './db';

export async function getContas(entidadeId) {
  await initDb();
  const db = getDb();
  let res;
  if (entidadeId) {
    res = db.exec("SELECT * FROM conta WHERE entidade_id = ? AND deleted_at IS NULL", [entidadeId]);
  } else {
    res = db.exec("SELECT * FROM conta WHERE deleted_at IS NULL");
  }
  
  if (!res[0]) return [];
  
  return res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export async function addConta(conta) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO conta (nome, tipo, saldo_inicial, entidade_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [conta.nome, conta.tipo, conta.saldo_inicial || 0, conta.entidade_id, now]);
}

export async function updateConta(id, conta) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    UPDATE conta 
    SET nome = ?, tipo = ?, saldo_inicial = ?, updated_at = ?
    WHERE id = ?
  `, [conta.nome, conta.tipo, conta.saldo_inicial, now, id]);
}

export async function deleteConta(id) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    UPDATE conta SET deleted_at = ?, updated_at = ? WHERE id = ?
  `, [now, now, id]);
}
