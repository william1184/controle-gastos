import { normalizeTransactions, sortTransactionsByDate } from '@/lib/transactionMapper';
import { getTagsByTransacao } from '@/lib/tagDb';

jest.mock('@/lib/tagDb', () => ({
  getTagsByTransacao: jest.fn().mockResolvedValue([])
}));

describe('transactionMapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve normalizar saídas corretamente', async () => {
    const mockSaidas = [
      { id: 1, apelido: 'Gasto 1', total: 100, data: '2024-05-01' }
    ];
    const result = await normalizeTransactions(mockSaidas, 'saida');
    
    expect(result[0].tipo).toBe('saida');
    expect(result[0].valor).toBe(100);
    expect(result[0].descricao).toBe('Gasto 1');
    expect(getTagsByTransacao).toHaveBeenCalledWith(1);
  });

  it('deve normalizar entradas corretamente', async () => {
    const mockEntradas = [
      { id: 2, descricao: 'Ganho 1', valor: 200, data: '2024-05-02' }
    ];
    const result = await normalizeTransactions(mockEntradas, 'entrada');
    
    expect(result[0].tipo).toBe('entrada');
    expect(result[0].valor).toBe(200);
    expect(result[0].descricao).toBe('Ganho 1');
  });

  it('deve ordenar transações por data decrescente', () => {
    const transactions = [
      { id: 1, data: '2024-01-01' },
      { id: 2, data: '2024-05-01' },
      { id: 3, data: '2024-03-01' }
    ];
    const result = sortTransactionsByDate(transactions);
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(3);
    expect(result[2].id).toBe(1);
  });
});
