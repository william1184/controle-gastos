import { getDb, initDb } from './db';
import { getActiveEntidade } from './entidadeDb';
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

export async function getRendas() {
  await initDb();
  const db = getDb();
  const res = db.exec(`
    SELECT t.*, c.nome as categoria_nome 
    FROM transacao t
    LEFT JOIN categoria c ON t.categoria_id = c.id
    WHERE t.tipo = 'entrada'
    ORDER BY t.data DESC
  `);
  
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
      perfilId: obj.usuario_id
    };
  });
}

export async function getRendaById(id) {
  await initDb();
  const db = getDb();
  const res = db.exec(`
    SELECT t.*, c.nome as categoria_nome 
    FROM transacao t
    LEFT JOIN categoria c ON t.categoria_id = c.id
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
    perfilId: obj.usuario_id
  };
}

export async function addRenda(renda) {
  await initDb();
  const db = getDb();
  
  const categoriaId = await getCategoryIdByName(db, renda.categoria, 'entrada');
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

  db.run(`
    INSERT INTO transacao (data, descricao, valor, tipo, categoria_id, conta_id, usuario_id, created_at)
    VALUES (?, ?, ?, 'entrada', ?, ?, ?, ?)
  `, [renda.data, renda.descricao, renda.valor, categoriaId, contaId, usuarioId, now]);
  
  const res = db.exec("SELECT last_insert_rowid()");
  return res[0].values[0][0];
}

export async function updateRenda(id, renda) {
  await initDb();
  const db = getDb();
  
  const categoriaId = await getCategoryIdByName(db, renda.categoria, 'entrada');
  const now = new Date().toISOString();

  db.run(`
    UPDATE transacao 
    SET data = ?, descricao = ?, valor = ?, categoria_id = ?, updated_at = ?
    WHERE id = ? AND tipo = 'entrada'
  `, [renda.data, renda.descricao, renda.valor, categoriaId, now, id]);
}

export async function deleteRenda(id) {
  await initDb();
  const db = getDb();
  db.run("DELETE FROM transacao WHERE id = ? AND tipo = 'entrada'", [id]);
}

export async function clearRendas() {
  await initDb();
  const db = getDb();
  db.run("DELETE FROM transacao WHERE tipo = 'entrada'");
}
