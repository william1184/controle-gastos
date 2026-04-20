import { getDb, initDb } from './db';
import { getActiveEntidade } from './entidadeDb';

export async function getItens(filters = {}) {
  await initDb();
  const db = getDb();
  const activeEntidade = await getActiveEntidade();
  const entidadeId = activeEntidade?.id || 0;

  let query = `
    SELECT i.*, t.data, t.descricao as transacao_descricao, c.nome as categoria_nome
    FROM itens_transacao i
    JOIN transacao t ON i.transacao_id = t.id
    JOIN usuario u ON t.usuario_id = u.id
    LEFT JOIN categoria c ON t.categoria_id = c.id
    WHERE u.entidade_id = ?
  `;
  
  const params = [entidadeId];

  if (filters.nome) {
    query += " AND i.nome LIKE ?";
    params.push(`%${filters.nome}%`);
  }

  if (filters.categoriaId) {
    query += " AND t.categoria_id = ?";
    params.push(filters.categoriaId);
  }

  query += " ORDER BY t.data DESC";

  const res = db.exec(query, params);
  
  if (!res[0]) return [];
  
  return res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return {
      id: obj.id,
      transacaoId: obj.transacao_id,
      nome: obj.nome,
      quantidade: obj.quantidade,
      unidade: obj.unidade,
      precoUnitario: obj.preco_unitario,
      total: obj.total,
      data: obj.data,
      transacaoDescricao: obj.transacao_descricao,
      categoriaNome: obj.categoria_nome || 'Outros'
    };
  });
}

export async function updateItem(id, item) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();

  db.run(`
    UPDATE itens_transacao
    SET nome = ?, quantidade = ?, unidade = ?, preco_unitario = ?, total = ?, updated_at = ?
    WHERE id = ?
  `, [item.nome, item.quantidade, item.unidade, item.precoUnitario, item.total, now, id]);
}

export async function deleteItem(id) {
  await initDb();
  const db = getDb();
  db.run("DELETE FROM itens_transacao WHERE id = ?", [id]);
}
