import { getDb, initDb } from './db';
import { getActiveEntidade } from './entidadeDb';
import { addRecorrencia, deleteRecorrencia, updateRecorrencia } from './recorrenciaDb';
import { getActiveUsuario } from './usuarioDb';

// Helper to get category ID by name
async function getCategoryIdByName(db, name, tipo = 'entrada') {
  const res = db.exec("SELECT id FROM categoria WHERE nome = ? AND tipo = ?", [name, tipo]);
  if (res[0] && res[0].values[0]) {
    return res[0].values[0][0];
  }
  // If not found, return 'Salário' or first entrada category
  const resFallback = db.exec("SELECT id FROM categoria WHERE tipo = 'entrada' LIMIT 1");
  return resFallback[0] ? resFallback[0].values[0][0] : 2;
}

export async function getEntradas(filters = {}) {
  await initDb();
  const db = getDb();

  const activeEntidade = await getActiveEntidade();
  const entidadeId = activeEntidade?.id || 0;

  let query = `
    SELECT t.*, c.nome as categoria_nome, co.nome as conta_nome 
    FROM transacao t
    LEFT JOIN categoria c ON t.categoria_id = c.id
    LEFT JOIN conta co ON t.conta_id = co.id
    LEFT JOIN usuario u ON t.usuario_id = u.id
    WHERE t.tipo = 'entrada' AND u.entidade_id = ?
  `;

  const params = [entidadeId];

  if (filters.categoria) {
    query += " AND c.nome = ?";
    params.push(filters.categoria);
  }

  if (filters.accountId) {
    query += " AND t.conta_id = ?";
    params.push(filters.accountId);
  }

  if (filters.startDate) {
    query += " AND t.data >= ?";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += " AND t.data <= ?";
    params.push(filters.endDate);
  }

  query += " ORDER BY t.data DESC";

  const res = db.exec(query, params);

  if (!res[0]) return [];
  return res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return {
      id: obj.id,
      data: obj.data,
      descricao: obj.descricao,
      categoria: obj.categoria_nome || 'Outros',
      valor: obj.valor,
      usuarioId: obj.usuario_id,
      contaId: obj.conta_id,
      contaNome: obj.conta_nome || '-',
      recorrenciaId: obj.recorrencia_id
    };
  });
}

export async function getEntradaById(id) {
  await initDb();
  const db = getDb();
  const res = db.exec(`
    SELECT t.*, c.nome as categoria_nome, co.nome as conta_nome 
    FROM transacao t
    LEFT JOIN categoria c ON t.categoria_id = c.id
    LEFT JOIN conta co ON t.conta_id = co.id
    WHERE t.id = ? AND t.tipo = 'entrada'
  `, [id]);

  if (!res[0]) return null;
  const row = res[0].values[0];
  const obj = {};
  res[0].columns.forEach((col, i) => obj[col] = row[i]);

  return {
    id: obj.id,
    data: obj.data,
    descricao: obj.descricao,
    categoria: obj.categoria_nome || 'Outros',
    valor: obj.valor,
    usuarioId: obj.usuario_id,
    contaId: obj.conta_id,
    contaNome: obj.conta_nome,
    recorrenciaId: obj.recorrencia_id
  };
}

export async function addEntrada(entrada) {
  await initDb();
  const db = getDb();

  const categoriaId = await getCategoryIdByName(db, entrada.categoria, 'entrada');
  const now = new Date().toISOString();

  const activeEntidade = await getActiveEntidade();
  const entidadeId = activeEntidade?.id || 1;

  const activeUser = await getActiveUsuario();
  let usuarioId = entrada.usuarioId || activeUser?.id;

  if (!usuarioId) {
    const userRes = db.exec("SELECT id FROM usuario WHERE entidade_id = ? LIMIT 1", [entidadeId]);
    usuarioId = userRes[0]?.values[0][0] || 1;
  }

  if (!entrada.contaId) {
    const accountRes = db.exec("SELECT id FROM conta WHERE entidade_id = ? LIMIT 1", [entidadeId]);
    entrada.contaId = accountRes[0]?.values[0][0] || 1;
  }

  let recorrenciaId = null;
  if (entrada.recorrencia) {
    recorrenciaId = await addRecorrencia({
      descricao: entrada.descricao || 'Recorrência de Entrada',
      frequencia: entrada.recorrencia.frequencia,
      proxima_execucao: calculateNextExecution(entrada.data, entrada.recorrencia.frequencia)
    });
  }

  db.run(`
    INSERT INTO transacao (data, descricao, valor, tipo, categoria_id, conta_id, usuario_id, recorrencia_id, created_at)
    VALUES (?, ?, ?, 'entrada', ?, ?, ?, ?, ?)
  `, [entrada.data, entrada.descricao, entrada.valor, categoriaId, entrada.contaId, usuarioId, recorrenciaId, now]);

  const res = db.exec("SELECT last_insert_rowid()");
  const transacaoId = res[0].values[0][0];

  // Default description if empty
  if (!entrada.descricao) {
    const defaultDesc = `Transação entrada ${transacaoId}`;
    db.run("UPDATE transacao SET descricao = ? WHERE id = ?", [defaultDesc, transacaoId]);
  }

  // Tags
  if (entrada.tagIds && entrada.tagIds.length > 0) {
    const { linkTagsToTransacao } = await import('./tagDb');
    await linkTagsToTransacao(transacaoId, entrada.tagIds);
  }

  return transacaoId;
}

export async function updateEntrada(id, entrada) {
  await initDb();
  const db = getDb();

  const categoriaId = await getCategoryIdByName(db, entrada.categoria, 'entrada');
  const now = new Date().toISOString();

  const existing = await getEntradaById(id);
  let recorrenciaId = existing.recorrenciaId;

  if (entrada.recorrencia) {
    if (recorrenciaId) {
      await updateRecorrencia(recorrenciaId, {
        descricao: entrada.descricao || 'Recorrência de Entrada',
        frequencia: entrada.recorrencia.frequencia,
        proxima_execucao: calculateNextExecution(entrada.data, entrada.recorrencia.frequencia)
      });
    } else {
      recorrenciaId = await addRecorrencia({
        descricao: entrada.descricao || 'Recorrência de Entrada',
        frequencia: entrada.recorrencia.frequencia,
        proxima_execucao: calculateNextExecution(entrada.data, entrada.recorrencia.frequencia)
      });
    }
  } else if (recorrenciaId) {
    // If it had recurrence but now it doesn't, we could delete it, 
    // but maybe keep it and just unlink? Usually deleting is better if unselected.
    await deleteRecorrencia(recorrenciaId);
    recorrenciaId = null;
  }

  db.run(`
    UPDATE transacao 
    SET data = ?, descricao = ?, valor = ?, categoria_id = ?, conta_id = ?, usuario_id = ?, recorrencia_id = ?, updated_at = ?
    WHERE id = ? AND tipo = 'entrada'
  `, [entrada.data, entrada.descricao, entrada.valor, categoriaId, entrada.contaId, entrada.usuarioId || existing.usuarioId, recorrenciaId, now, id]);
}

export async function updateEntradaCategory(id, categoryName) {
  await initDb();
  const db = getDb();

  const categoriaId = await getCategoryIdByName(db, categoryName, 'entrada');
  const now = new Date().toISOString();

  db.run(`
    UPDATE transacao 
    SET categoria_id = ?, updated_at = ?
    WHERE id = ? AND tipo = 'entrada'
  `, [categoriaId, now, id]);
}

export async function deleteEntrada(id) {
  await initDb();
  const db = getDb();

  const entrada = await getEntradaById(id);
  if (entrada && entrada.recorrenciaId) {
    await deleteRecorrencia(entrada.recorrenciaId);
  }

  db.run("DELETE FROM transacao WHERE id = ? AND tipo = 'entrada'", [id]);
}

export async function clearEntradas() {
  await initDb();
  const db = getDb();
  db.run("DELETE FROM transacao WHERE tipo = 'entrada'");
}

function calculateNextExecution(currentDate, frequencia) {
  const date = new Date(currentDate);
  if (frequencia === 'semanal') {
    date.setDate(date.getDate() + 7);
  } else if (frequencia === 'mensal') {
    date.setMonth(date.getMonth() + 1);
  } else if (frequencia === 'anual') {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date.toISOString().split('T')[0];
}

