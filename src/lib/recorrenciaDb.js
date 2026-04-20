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

export async function getRecorrencias() {
  await initDb();
  const db = getDb();
  const { getActiveEntidade } = await import('./entidadeDb');
  const activeEntidade = await getActiveEntidade();
  const entidadeId = activeEntidade?.id || 0;

  // We filter recurrences that are linked to transactions belonging to the current entity
  const query = `
    SELECT r.*, t.data as data_origem, t.id as transacao_id
    FROM recorrencia r
    JOIN transacao t ON t.recorrencia_id = r.id
    JOIN usuario u ON t.usuario_id = u.id
    WHERE u.entidade_id = ? AND r.deleted_at IS NULL
    ORDER BY r.proxima_execucao ASC
  `;

  const res = db.exec(query, [entidadeId]);
  
  if (!res[0]) return [];
  
  return res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return {
      id: obj.id,
      descricao: obj.descricao,
      frequencia: obj.frequencia,
      proximaExecucao: obj.proxima_execucao,
      dataOrigem: obj.data_origem,
      transacaoId: obj.transacao_id
    };
  });
}
