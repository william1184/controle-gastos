import { calculateTotals, calculateTotalsByCategory, calculateTotalsByCostType, getAvailableMonths } from '@/lib/financialCalculations';

describe('financialCalculations', () => {
  const mockTransactions = [
    { id: 1, data: '2024-05-01', total: 100, categoria: 'Alimentação', tipoCusto: 'Variável' },
    { id: 2, data: '2024-05-15', total: 50, categoria: 'Alimentação', tipoCusto: 'Variável' },
    { id: 3, data: '2024-04-10', total: 200, categoria: 'Moradia', tipoCusto: 'Fixo' },
  ];

  it('deve calcular o total de transações', () => {
    expect(calculateTotals(mockTransactions)).toBe(350);
  });

  it('deve calcular totais por categoria', () => {
    const result = calculateTotalsByCategory(mockTransactions);
    expect(result['Alimentação']).toBe(150);
    expect(result['Moradia']).toBe(200);
  });

  it('deve calcular totais por tipo de custo', () => {
    const result = calculateTotalsByCostType(mockTransactions);
    expect(result['Variável']).toBe(150);
    expect(result['Fixo']).toBe(200);
  });

  it('deve retornar os meses disponíveis ordenados', () => {
    const months = getAvailableMonths(mockTransactions);
    expect(months).toEqual(['2024-05', '2024-04']);
  });
});
