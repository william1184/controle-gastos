import { getTagsByTransacao } from './tagDb';

/**
 * Normalizes transactions from different tables into a unified format.
 */
export async function normalizeTransactions(transactions, type) {
  return await Promise.all(transactions.map(async t => {
    const isSaida = type === 'saida';
    return {
      ...t,
      tipo: type,
      valor: isSaida ? t.total : t.valor,
      descricao: isSaida ? t.apelido : t.descricao,
      tags: await getTagsByTransacao(t.id)
    };
  }));
}

export function sortTransactionsByDate(transactions) {
  return [...transactions].sort((a, b) => new Date(b.data) - new Date(a.data));
}
