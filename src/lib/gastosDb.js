import { getDb, initDb } from './db';
import { getActiveEntidade } from './entidadeDb';
import { getActiveUsuario } from './usuarioDb';
import { addRecorrencia, deleteRecorrencia, getRecorrenciaById, updateRecorrencia } from './recorrenciaDb';

// Helper to get category ID by name
async function getCategoryIdByName(db, name, tipo = 'saida') {
  const res = db.exec("SELECT id FROM categoria WHERE nome = ? AND tipo = ?", [name, tipo]);
  if (res[0] && res[0].values[0]) {
    return res[0].values[0][0];
  }
  // If not found, return 'Outros' (id 7 based on seeding)
  return 7; 
}

export async function getGastos(filters = {}) {
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
    WHERE t.tipo = 'saida' AND u.entidade_id = ?
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

  if (filters.tipoCusto) {
    query += " AND t.tipo_custo = ?";
    params.push(filters.tipoCusto);
  }
  
  query += " ORDER BY t.data DESC";
  
  const res = db.exec(query, params);
  
  let loadedGastos = res[0] ? res[0].values.map(row => {
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
      gasto_id: obj.transacao_id,
      preco_total: obj.total
    };
  }) : [];

  loadedGastos = loadedGastos.map(g => ({
    ...g,
    produtos: todosProdutos.filter(p => p.gasto_id === g.id)
  }));
  return loadedGastos;
}

export async function getGastoById(id) {
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

  const mappedGasto = {
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
      gasto_id: pObj.transacao_id,
      preco_total: pObj.total
    };
  }) : [];
  mappedGasto.produtos = produtos;
  return mappedGasto;
}

export async function addGasto(gasto) {
  await initDb();
  const db = getDb();
  
  const categoriaId = await getCategoryIdByName(db, gasto.categoria, 'saida');
  const now = new Date().toISOString();

  const activeEntidade = await getActiveEntidade();
  const entidadeId = activeEntidade?.id || 1;
  
  const activeUser = await getActiveUsuario();
  let usuarioId = gasto.usuarioId || activeUser?.id;

  if (!usuarioId) {
    const userRes = db.exec("SELECT id FROM usuario WHERE entidade_id = ? LIMIT 1", [entidadeId]);
    usuarioId = userRes[0]?.values[0][0] || 1;
  }

  if (!gasto.contaId) {
    const accountRes = db.exec("SELECT id FROM conta WHERE entidade_id = ? LIMIT 1", [entidadeId]);
    gasto.contaId = accountRes[0]?.values[0][0] || 1;
  }

  let recorrenciaId = null;
  if (gasto.recorrencia) {
    recorrenciaId = await addRecorrencia({
      descricao: gasto.apelido || 'Recorrência de Gasto',
      frequencia: gasto.recorrencia.frequencia,
      proxima_execucao: calculateNextExecution(gasto.data, gasto.recorrencia.frequencia)
    });
  }

  db.run(`
    INSERT INTO transacao (data, descricao, valor, tipo, categoria_id, conta_id, usuario_id, recorrencia_id, tipo_custo, created_at)
    VALUES (?, ?, ?, 'saida', ?, ?, ?, ?, ?, ?)
  `, [gasto.data, gasto.apelido, gasto.total, categoriaId, gasto.contaId, usuarioId, recorrenciaId, gasto.tipoCusto || 'Variável', now]);
  
  const res = db.exec("SELECT last_insert_rowid()");
  const transacaoId = res[0].values[0][0];

  // Default description if empty
  if (!gasto.apelido) {
    const defaultDesc = `Transação saída ${transacaoId}`;
    db.run("UPDATE transacao SET descricao = ? WHERE id = ?", [defaultDesc, transacaoId]);
  }

  // Tags
  if (gasto.tagIds && gasto.tagIds.length > 0) {
    const { linkTagsToTransacao } = await import('./tagDb');
    await linkTagsToTransacao(transacaoId, gasto.tagIds);
  }

  const productsToInsert = (gasto.produtos && gasto.produtos.length > 0) 
    ? gasto.produtos 
    : [{ nome: gasto.apelido || '', quantidade: 1, unidade: 'un', preco_unitario: gasto.total, preco_total: gasto.total }];

  productsToInsert.forEach(p => {
    db.run(`
      INSERT INTO itens_transacao (transacao_id, nome, quantidade, unidade, preco_unitario, total, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [transacaoId, p.nome, p.quantidade, p.unidade, p.preco_unitario, p.preco_total, now]);
    
    // Default description for item if empty
    if (!p.nome) {
      const itemRes = db.exec("SELECT last_insert_rowid()");
      const itemId = itemRes[0].values[0][0];
      const defaultItemDesc = `Item ${gasto.categoria || 'Outros'} ${itemId}`;
      db.run("UPDATE itens_transacao SET nome = ? WHERE id = ?", [defaultItemDesc, itemId]);
    }
  });

  return transacaoId;
}

export async function updateGasto(id, gasto) {
  await initDb();
  const db = getDb();
  
  const categoriaId = await getCategoryIdByName(db, gasto.categoria, 'saida');
  const now = new Date().toISOString();

  const existing = await getGastoById(id);
  let recorrenciaId = existing.recorrenciaId;

  if (gasto.recorrencia) {
    if (recorrenciaId) {
      await updateRecorrencia(recorrenciaId, {
        descricao: gasto.apelido || 'Recorrência de Gasto',
        frequencia: gasto.recorrencia.frequencia,
        proxima_execucao: calculateNextExecution(gasto.data, gasto.recorrencia.frequencia)
      });
    } else {
      recorrenciaId = await addRecorrencia({
        descricao: gasto.apelido || 'Recorrência de Gasto',
        frequencia: gasto.recorrencia.frequencia,
        proxima_execucao: calculateNextExecution(gasto.data, gasto.recorrencia.frequencia)
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
  `, [gasto.data, gasto.apelido, gasto.total, categoriaId, gasto.contaId, gasto.usuarioId || existing.usuarioId, recorrenciaId, gasto.tipoCusto || 'Variável', now, id]);
  
  db.run("DELETE FROM itens_transacao WHERE transacao_id = ?", [id]);
  
  const productsToInsert = (gasto.produtos && gasto.produtos.length > 0) 
    ? gasto.produtos 
    : [{ nome: gasto.apelido || 'Gasto sem itens', quantidade: 1, unidade: 'un', preco_unitario: gasto.total, preco_total: gasto.total }];

  productsToInsert.forEach(p => {
    db.run(`
      INSERT INTO itens_transacao (transacao_id, nome, quantidade, unidade, preco_unitario, total, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, p.nome, p.quantidade, p.unidade, p.preco_unitario, p.preco_total, now]);
  });
}

export async function updateGastoCategoryAndType(id, categoryName, tipoCusto) {
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

export async function deleteGasto(id) {
  await initDb();
  const db = getDb();
  
  const gasto = await getGastoById(id);
  if (gasto && gasto.recorrenciaId) {
    await deleteRecorrencia(gasto.recorrenciaId);
  }

  db.run("DELETE FROM itens_transacao WHERE transacao_id = ?", [id]);
  db.run("DELETE FROM transacao WHERE id = ? AND tipo = 'saida'", [id]);
}

export async function clearGastos() {
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

