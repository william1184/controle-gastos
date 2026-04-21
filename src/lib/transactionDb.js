import { getDb, initDb } from './db';
import { getActiveEntidade } from './entidadeDb';
import { getTagsByTransacao } from './tagDb';

export async function getTransactions(filters = {}) {
  await initDb();
  const db = getDb();

  const activeEntidade = await getActiveEntidade();
  const entidadeId = activeEntidade?.id || 0;

  let queryBase = `
    FROM transacao t
    LEFT JOIN categoria c ON t.categoria_id = c.id
    LEFT JOIN conta co ON t.conta_id = co.id
    LEFT JOIN usuario u ON t.usuario_id = u.id
    WHERE u.entidade_id = ?
  `;

  const params = [entidadeId];

  if (filters.tipo) {
    queryBase += " AND t.tipo = ?";
    params.push(filters.tipo);
  }

  if (filters.descricao) {
    queryBase += " AND t.descricao LIKE ?";
    params.push(`%${filters.descricao}%`);
  }

  if (filters.categoriaId) {
    queryBase += " AND t.categoria_id = ?";
    params.push(filters.categoriaId);
  }

  if (filters.contaId) {
    queryBase += " AND t.conta_id = ?";
    params.push(filters.contaId);
  }

  if (filters.startDate) {
    queryBase += " AND t.data >= ?";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    queryBase += " AND t.data <= ?";
    params.push(filters.endDate);
  }

  if (filters.valorMin) {
    queryBase += " AND t.valor >= ?";
    params.push(filters.valorMin);
  }

  if (filters.valorMax) {
    queryBase += " AND t.valor <= ?";
    params.push(filters.valorMax);
  }

  // Count
  const countRes = db.exec(`SELECT COUNT(*) as total ${queryBase}`, params);
  const total = countRes[0]?.values[0][0] || 0;

  let query = `
    SELECT t.*, c.nome as categoria_nome, co.nome as conta_nome 
    ${queryBase}
    ORDER BY t.data DESC
  `;

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;

  if (filters.page) {
    query += " LIMIT ? OFFSET ?";
    params.push(pageSize);
    params.push((page - 1) * pageSize);
  }

  const res = db.exec(query, params);

  if (!res[0]) {
    return { data: [], total, page, pageSize };
  }

  const data = await Promise.all(res[0].values.map(async row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    
    // Get items if needed (optional optimization: only fetch if requested or always for now)
    const itemsRes = db.exec("SELECT * FROM itens_transacao WHERE transacao_id = ?", [obj.id]);
    const items = itemsRes[0] ? itemsRes[0].values.map(iRow => {
      const iObj = {};
      itemsRes[0].columns.forEach((col, i) => iObj[col] = iRow[i]);
      return iObj;
    }) : [];

    return {
      id: obj.id,
      data: obj.data,
      descricao: obj.descricao,
      valor: obj.valor,
      tipo: obj.tipo,
      categoria: obj.categoria_nome || 'Outros',
      contaId: obj.conta_id,
      contaNome: obj.conta_nome || '-',
      tipoCusto: obj.tipo_custo,
      tags: await getTagsByTransacao(obj.id),
      produtos: items
    };
  }));

  return {
    data,
    total,
    page,
    pageSize
  };
}
