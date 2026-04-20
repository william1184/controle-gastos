import { getDb, initDb } from './db';
import { getActiveEntidade } from './entidadeDb';
import { getActiveUsuario } from './usuarioDb';
import { addRecorrencia, deleteRecorrencia, getRecorrenciaById, updateRecorrencia } from './recorrenciaDb';

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

export async function getRendas(filters = {}) {
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
      perfilId: obj.usuario_id,
      contaId: obj.conta_id,
      contaNome: obj.conta_nome || '-',
      recorrenciaId: obj.recorrencia_id
    };
  });
}

export async function getRendaById(id) {
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
    perfilId: obj.usuario_id,
    contaId: obj.conta_id,
    contaNome: obj.conta_nome,
    recorrenciaId: obj.recorrencia_id
  };
}

export async function addRenda(renda) {
  await initDb();
  const db = getDb();
  
  const categoriaId = await getCategoryIdByName(db, renda.categoria, 'entrada');
  const now = new Date().toISOString();

  const activeEntidade = await getActiveEntidade();
  const entidadeId = activeEntidade?.id || 1;
  
  const activeUser = await getActiveUsuario();
  let usuarioId = activeUser?.id;

  if (!usuarioId) {
    const userRes = db.exec("SELECT id FROM usuario WHERE entidade_id = ? LIMIT 1", [entidadeId]);
    usuarioId = userRes[0]?.values[0][0] || 1;
  }

  if (!renda.contaId) {
    const accountRes = db.exec("SELECT id FROM conta WHERE entidade_id = ? LIMIT 1", [entidadeId]);
    renda.contaId = accountRes[0]?.values[0][0] || 1;
  }

  let recorrenciaId = null;
  if (renda.recorrencia) {
    recorrenciaId = await addRecorrencia({
      descricao: renda.descricao || 'Recorrência de Renda',
      frequencia: renda.recorrencia.frequencia,
      proxima_execucao: calculateNextExecution(renda.data, renda.recorrencia.frequencia)
    });
  }

  db.run(`
    INSERT INTO transacao (data, descricao, valor, tipo, categoria_id, conta_id, usuario_id, recorrencia_id, created_at)
    VALUES (?, ?, ?, 'entrada', ?, ?, ?, ?, ?)
  `, [renda.data, renda.descricao, renda.valor, categoriaId, renda.contaId, usuarioId, recorrenciaId, now]);
  
  const res = db.exec("SELECT last_insert_rowid()");
  return res[0].values[0][0];
}

export async function updateRenda(id, renda) {
  await initDb();
  const db = getDb();
  
  const categoriaId = await getCategoryIdByName(db, renda.categoria, 'entrada');
  const now = new Date().toISOString();

  const existing = await getRendaById(id);
  let recorrenciaId = existing.recorrenciaId;

  if (renda.recorrencia) {
    if (recorrenciaId) {
      await updateRecorrencia(recorrenciaId, {
        descricao: renda.descricao || 'Recorrência de Renda',
        frequencia: renda.recorrencia.frequencia,
        proxima_execucao: calculateNextExecution(renda.data, renda.recorrencia.frequencia)
      });
    } else {
      recorrenciaId = await addRecorrencia({
        descricao: renda.descricao || 'Recorrência de Renda',
        frequencia: renda.recorrencia.frequencia,
        proxima_execucao: calculateNextExecution(renda.data, renda.recorrencia.frequencia)
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
    SET data = ?, descricao = ?, valor = ?, categoria_id = ?, conta_id = ?, recorrencia_id = ?, updated_at = ?
    WHERE id = ? AND tipo = 'entrada'
  `, [renda.data, renda.descricao, renda.valor, categoriaId, renda.contaId, recorrenciaId, now, id]);
}

export async function deleteRenda(id) {
  await initDb();
  const db = getDb();
  
  const renda = await getRendaById(id);
  if (renda && renda.recorrenciaId) {
    await deleteRecorrencia(renda.recorrenciaId);
  }

  db.run("DELETE FROM transacao WHERE id = ? AND tipo = 'entrada'", [id]);
}

export async function clearRendas() {
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

