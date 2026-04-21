/**
 * Utility functions for financial calculations.
 */

export const calculateTotals = (transactions, typeKey = 'total') => {
  return transactions.reduce((acc, t) => acc + (Number(t[typeKey]) || 0), 0);
};

export const calculateTotalsByCategory = (transactions, typeKey = 'total') => {
  return transactions.reduce((acc, t) => {
    const cat = t.categoria || 'Sem Categoria';
    acc[cat] = (acc[cat] || 0) + (Number(t[typeKey]) || 0);
    return acc;
  }, {});
};

export const calculateTotalsByCostType = (transactions, typeKey = 'total') => {
  return transactions.reduce((acc, t) => {
    const type = t.tipoCusto || 'Outro';
    acc[type] = (acc[type] || 0) + (Number(t[typeKey]) || 0);
    return acc;
  }, {});
};

export const formatCurrencyBRL = (value) => {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const getAvailableMonths = (transactions) => {
  const meses = new Set();
  transactions.forEach(t => {
    if (t.data) meses.add(t.data.substring(0, 7));
  });
  return Array.from(meses).sort().reverse();
};
