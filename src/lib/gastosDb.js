import { getDb, initDb } from './db';
import { getActiveEntidade } from './entidadeDb';
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

export async function getGastos() {
  await initDb();
  const db = getDb();
  // Get all transactions of type 'saida'
  const res = db.exec(`
    SELECT t.*, c.nome as categoria_nome 
    FROM transacao t
    LEFT JOIN categoria c ON t.categoria_id = c.id
    WHERE t.tipo = 'saida'
    ORDER BY t.data DESC
  `);
  
  let loadedGastos = res[0] ? res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    // Map back to UI expectations
    return {
      id: obj.id,
      data: obj.data,
      apelido: obj.descricao,
      categoria: obj.categoria_nome || 'Outros',
      total: obj.valor,
      tipoCusto: 'Variável', // Default
      perfilId: obj.usuario_id
    };
  }) : [];

  const prodRes = db.exec("SELECT * FROM itens_transacao");
  const todosProdutos = prodRes[0] ? prodRes[0].values.map(row => {
    const obj = {};
    prodRes[0].columns.forEach((col, i) => obj[col] = row[i]);
    // Map back to UI expectations
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
    SELECT t.*, c.nome as categoria_nome 
    FROM transacao t
    LEFT JOIN categoria c ON t.categoria_id = c.id
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
    tipoCusto: 'Variável',
    perfilId: obj.usuario_id
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
  
  // Buscar usuário ativo ou o primeiro da entidade
  const activeUser = await getActiveUsuario();
  let usuarioId = activeUser?.id;

  if (!usuarioId) {
    const userRes = db.exec("SELECT id FROM usuario WHERE entidade_id = ? LIMIT 1", [entidadeId]);
    usuarioId = userRes[0]?.values[0][0] || 1;
  }

  const accountRes = db.exec("SELECT id FROM conta WHERE entidade_id = ? LIMIT 1", [entidadeId]);
  const contaId = accountRes[0]?.values[0][0] || 1;

  // Insert into transacao
  db.run(`
    INSERT INTO transacao (data, descricao, valor, tipo, categoria_id, conta_id, usuario_id, created_at)
    VALUES (?, ?, ?, 'saida', ?, ?, ?, ?)
  `, [gasto.data, gasto.apelido, gasto.total, categoriaId, contaId, usuarioId, now]);
  
  const res = db.exec("SELECT last_insert_rowid()");
  const transacaoId = res[0].values[0][0];

  if (gasto.produtos && gasto.produtos.length > 0) {
    gasto.produtos.forEach(p => {
      db.run(`
        INSERT INTO itens_transacao (transacao_id, nome, quantidade, unidade, preco_unitario, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [transacaoId, p.nome, p.quantidade, p.unidade, p.preco_unitario, p.preco_total, now]);
    });
  }
  return transacaoId;
}

export async function updateGasto(id, gasto) {
  await initDb();
  const db = getDb();
  
  const categoriaId = await getCategoryIdByName(db, gasto.categoria, 'saida');
  const now = new Date().toISOString();

  db.run(`
    UPDATE transacao 
    SET data = ?, descricao = ?, valor = ?, categoria_id = ?, updated_at = ?
    WHERE id = ? AND tipo = 'saida'
  `, [gasto.data, gasto.apelido, gasto.total, categoriaId, now, id]);
  
  // Exclui itens antigos e re-insere
  db.run("DELETE FROM itens_transacao WHERE transacao_id = ?", [id]);
  if (gasto.produtos && gasto.produtos.length > 0) {
    gasto.produtos.forEach(p => {
      db.run(`
        INSERT INTO itens_transacao (transacao_id, nome, quantidade, unidade, preco_unitario, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, p.nome, p.quantidade, p.unidade, p.preco_unitario, p.preco_total, now]);
    });
  }
}

export async function deleteGasto(id) {
  await initDb();
  const db = getDb();
  // Itens são excluídos por Trigger ou Cascateamento se definirmos, mas vamos ser explícitos se não houver ON DELETE CASCADE
  db.run("DELETE FROM itens_transacao WHERE transacao_id = ?", [id]);
  db.run("DELETE FROM transacao WHERE id = ? AND tipo = 'saida'", [id]);
}

export async function clearGastos() {
  await initDb();
  const db = getDb();
  // Deleta todas as transações de saída e seus itens
  db.run("DELETE FROM itens_transacao WHERE transacao_id IN (SELECT id FROM transacao WHERE tipo = 'saida')");
  db.run("DELETE FROM transacao WHERE tipo = 'saida'");
}
