import { getDb, initDb } from './db';
import { getActiveEntidade } from './entidadeDb';
import { addRecorrencia, deleteRecorrencia, updateRecorrencia } from './recorrenciaDb';
import { getActiveUsuario } from './usuarioDb';

// Helper to get category ID by name
async function getCategoryIdByName(db, name, tipo = 'saida') {
  const res = db.exec("SELECT id FROM categoria WHERE nome = ? AND tipo = ?", [name, tipo]);
  if (res[0] && res[0].values[0]) {
    return res[0].values[0][0];
  }
  // If not found, return 'Outros' (id 7 based on seeding)
  return 7;
}

export async function getSaidas(filters = {}) {
  await initDb();
  const db = getDb();

  const activeEntidade = await getActiveEntidade();
  const entidadeId = activeEntidade?.id || 0;

  let queryBase = `
    FROM transacao t
    LEFT JOIN categoria c ON t.categoria_id = c.id
    LEFT JOIN conta co ON t.conta_id = co.id
    LEFT JOIN usuario u ON t.usuario_id = u.id
    WHERE t.tipo = 'saida' AND u.entidade_id = ?
  `;

  const params = [entidadeId];

  if (filters.categoria) {
    queryBase += " AND c.nome = ?";
    params.push(filters.categoria);
  }

  if (filters.accountId) {
    queryBase += " AND t.conta_id = ?";
    params.push(filters.accountId);
  }

  if (filters.startDate) {
    queryBase += " AND t.data >= ?";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    queryBase += " AND t.data <= ?";
    params.push(filters.endDate);
  }

  if (filters.tipoCusto) {
    queryBase += " AND t.tipo_custo = ?";
    params.push(filters.tipoCusto);
  }

  // Get total count
  const countRes = db.exec(`SELECT COUNT(*) as total ${queryBase}`, params);
  const total = countRes[0]?.values[0][0] || 0;

  let query = `SELECT t.*, c.nome as categoria_nome, co.nome as conta_nome ${queryBase}`;
  query += " ORDER BY t.data DESC";

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 1000; // Default large if not specified
  
  if (filters.page) {
    query += " LIMIT ? OFFSET ?";
    params.push(pageSize);
    params.push((page - 1) * pageSize);
  }

  const res = db.exec(query, params);

  let loadedSaidas = res[0] ? res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return {
      id: obj.id,
      data: obj.data,
      apelido: obj.descricao,
      categoria: obj.categoria_nome || 'Outros',
      total: obj.valor,
      tipoCusto: obj.tipo_custo || 'Variável',
      usuarioId: obj.usuario_id,
      contaId: obj.conta_id,
      contaNome: obj.conta_nome || '-',
      recorrenciaId: obj.recorrencia_id
    };
  }) : [];

  const prodRes = db.exec("SELECT * FROM itens_transacao");
  const todosProdutos = prodRes[0] ? prodRes[0].values.map(row => {
    const obj = {};
    prodRes[0].columns.forEach((col, i) => obj[col] = row[i]);
    return {
      ...obj,
      saida_id: obj.transacao_id,
      preco_total: obj.total
    };
  }) : [];

  loadedSaidas = loadedSaidas.map(g => ({
    ...g,
    produtos: todosProdutos.filter(p => p.saida_id === g.id)
  }));

  if (filters.page) {
    return {
      data: loadedSaidas,
      total,
      page,
      pageSize
    };
  }

  return loadedSaidas;
}

export async function getSaidaById(id) {
  await initDb();
  const db = getDb();
  const res = db.exec(`
    SELECT t.*, c.nome as categoria_nome, co.nome as conta_nome 
    FROM transacao t
    LEFT JOIN categoria c ON t.categoria_id = c.id
    LEFT JOIN conta co ON t.conta_id = co.id
    WHERE t.id = ? AND t.tipo = 'saida'
  `, [id]);

  if (!res[0]) return null;
  const row = res[0].values[0];
  const obj = {};
  res[0].columns.forEach((col, i) => obj[col] = row[i]);

  const mappedSaida = {
    id: obj.id,
    data: obj.data,
    apelido: obj.descricao,
    categoria: obj.categoria_nome || 'Outros',
    total: obj.valor,
    tipoCusto: obj.tipo_custo || 'Variável',
    usuarioId: obj.usuario_id,
    contaId: obj.conta_id,
    contaNome: obj.conta_nome,
    recorrenciaId: obj.recorrencia_id
  };

  const prodRes = db.exec("SELECT * FROM itens_transacao WHERE transacao_id = ?", [id]);
  const produtos = prodRes[0] ? prodRes[0].values.map(pRow => {
    const pObj = {};
    prodRes[0].columns.forEach((col, i) => pObj[col] = pRow[i]);
    return {
      ...pObj,
      saida_id: pObj.transacao_id,
      preco_total: pObj.total
    };
  }) : [];
  mappedSaida.produtos = produtos;
  return mappedSaida;
}

export async function addSaida(saida) {
  await initDb();
  const db = getDb();

  const categoriaId = await getCategoryIdByName(db, saida.categoria, 'saida');
  const now = new Date().toISOString();

  const activeEntidade = await getActiveEntidade();
  const entidadeId = activeEntidade?.id || 1;

  const activeUser = await getActiveUsuario();
  let usuarioId = saida.usuarioId || activeUser?.id;

  if (!usuarioId) {
    const userRes = db.exec("SELECT id FROM usuario WHERE entidade_id = ? LIMIT 1", [entidadeId]);
    usuarioId = userRes[0]?.values[0][0] || 1;
  }

  if (!saida.contaId) {
    const accountRes = db.exec("SELECT id FROM conta WHERE entidade_id = ? LIMIT 1", [entidadeId]);
    saida.contaId = accountRes[0]?.values[0][0] || 1;
  }

  let recorrenciaId = null;
  if (saida.recorrencia) {
    recorrenciaId = await addRecorrencia({
      descricao: saida.apelido || 'Recorrência de Saida',
      frequencia: saida.recorrencia.frequencia,
      proxima_execucao: calculateNextExecution(saida.data, saida.recorrencia.frequencia)
    });
  }

  db.run(`
    INSERT INTO transacao (data, descricao, valor, tipo, categoria_id, conta_id, usuario_id, recorrencia_id, tipo_custo, created_at)
    VALUES (?, ?, ?, 'saida', ?, ?, ?, ?, ?, ?)
  `, [saida.data, saida.apelido, saida.total, categoriaId, saida.contaId, usuarioId, recorrenciaId, saida.tipoCusto || 'Variável', now]);

  const res = db.exec("SELECT last_insert_rowid()");
  const transacaoId = res[0].values[0][0];

  // Default description if empty
  if (!saida.apelido) {
    const defaultDesc = `Transação saída ${transacaoId}`;
    db.run("UPDATE transacao SET descricao = ? WHERE id = ?", [defaultDesc, transacaoId]);
  }

  // Tags
  if (saida.tagIds && saida.tagIds.length > 0) {
    const { linkTagsToTransacao } = await import('./tagDb');
    await linkTagsToTransacao(transacaoId, saida.tagIds);
  }

  const productsToInsert = (saida.produtos && saida.produtos.length > 0)
    ? saida.produtos
    : [{ nome: saida.apelido || '', quantidade: 1, unidade: 'un', preco_unitario: saida.total, preco_total: saida.total }];

  productsToInsert.forEach(p => {
    db.run(`
      INSERT INTO itens_transacao (transacao_id, nome, quantidade, unidade, preco_unitario, total, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [transacaoId, p.nome || '', p.quantidade || 1, p.unidade || 'un', p.preco_unitario || 0, p.preco_total || 0, now]);

    // Default description for item if empty
    if (!p.nome) {
      const itemRes = db.exec("SELECT last_insert_rowid()");
      const itemId = itemRes[0].values[0][0];
      const defaultItemDesc = `Item ${saida.categoria || 'Outros'} ${itemId}`;
      db.run("UPDATE itens_transacao SET nome = ? WHERE id = ?", [defaultItemDesc, itemId]);
    }
  });

  return transacaoId;
}

export async function updateSaida(id, saida) {
  await initDb();
  const db = getDb();

  const categoriaId = await getCategoryIdByName(db, saida.categoria, 'saida');
  const now = new Date().toISOString();

  const existing = await getSaidaById(id);
  let recorrenciaId = existing.recorrenciaId;

  if (saida.recorrencia) {
    if (recorrenciaId) {
      await updateRecorrencia(recorrenciaId, {
        descricao: saida.apelido || 'Recorrência de Saida',
        frequencia: saida.recorrencia.frequencia,
        proxima_execucao: calculateNextExecution(saida.data, saida.recorrencia.frequencia)
      });
    } else {
      recorrenciaId = await addRecorrencia({
        descricao: saida.apelido || 'Recorrência de Saida',
        frequencia: saida.recorrencia.frequencia,
        proxima_execucao: calculateNextExecution(saida.data, saida.recorrencia.frequencia)
      });
    }
  } else if (recorrenciaId) {
    await deleteRecorrencia(recorrenciaId);
    recorrenciaId = null;
  }

  db.run(`
    UPDATE transacao 
    SET data = ?, descricao = ?, valor = ?, categoria_id = ?, conta_id = ?, usuario_id = ?, recorrencia_id = ?, tipo_custo = ?, updated_at = ?
    WHERE id = ? AND tipo = 'saida'
  `, [saida.data, saida.apelido, saida.total, categoriaId, saida.contaId, saida.usuarioId || existing.usuarioId, recorrenciaId, saida.tipoCusto || 'Variável', now, id]);

  db.run("DELETE FROM itens_transacao WHERE transacao_id = ?", [id]);

  const productsToInsert = (saida.produtos && saida.produtos.length > 0)
    ? saida.produtos
    : [{ nome: saida.apelido || 'Saida sem itens', quantidade: 1, unidade: 'un', preco_unitario: saida.total, preco_total: saida.total }];

  productsToInsert.forEach(p => {
    db.run(`
      INSERT INTO itens_transacao (transacao_id, nome, quantidade, unidade, preco_unitario, total, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, p.nome || '', p.quantidade || 1, p.unidade || 'un', p.preco_unitario || 0, p.preco_total || 0, now]);
  });
}

export async function updateSaidaCategoryAndType(id, categoryName, tipoCusto) {
  await initDb();
  const db = getDb();

  const categoriaId = await getCategoryIdByName(db, categoryName, 'saida');
  const now = new Date().toISOString();

  db.run(`
    UPDATE transacao 
    SET categoria_id = ?, tipo_custo = ?, updated_at = ?
    WHERE id = ? AND tipo = 'saida'
  `, [categoriaId, tipoCusto, now, id]);
}

export async function deleteSaida(id) {
  await initDb();
  const db = getDb();

  const saida = await getSaidaById(id);
  if (saida && saida.recorrenciaId) {
    await deleteRecorrencia(saida.recorrenciaId);
  }

  db.run("DELETE FROM itens_transacao WHERE transacao_id = ?", [id]);
  db.run("DELETE FROM transacao WHERE id = ? AND tipo = 'saida'", [id]);
}

export async function clearSaidas() {
  await initDb();
  const db = getDb();
  db.run("DELETE FROM itens_transacao WHERE transacao_id IN (SELECT id FROM transacao WHERE tipo = 'saida')");
  db.run("DELETE FROM transacao WHERE tipo = 'saida'");
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

