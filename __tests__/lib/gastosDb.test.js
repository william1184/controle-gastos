import { initDb, getDb } from '@/lib/db';
import { addGasto, getGastos, clearGastos, getGastoById, deleteGasto } from '@/lib/gastosDb';

describe('gastosDb Operations', () => {
  beforeAll(async () => {
    // Initialize the in-memory database
    await initDb();
  });

  beforeEach(async () => {
    // Clear data before each test to ensure a clean slate
    await clearGastos();
  });

  it('deve adicionar e recuperar um gasto', async () => {
    const novoGasto = {
      data: '2026-04-20',
      apelido: 'Mercado',
      categoria: 'Alimentação',
      total: 150.50,
      tipoCusto: 'Variável',
      perfilId: 1,
      produtos: []
    };

    const id = await addGasto(novoGasto);
    expect(id).toBeDefined();

    const gastos = await getGastos();
    expect(gastos).toHaveLength(1);
    expect(gastos[0].apelido).toBe('Mercado');
    expect(gastos[0].total).toBe(150.50);
  });

  it('deve adicionar um gasto com produtos e recupera-lo corretamente', async () => {
    const novoGasto = {
      data: '2026-04-20',
      apelido: 'Açougue',
      categoria: 'Alimentação',
      total: 50.00,
      tipoCusto: 'Variável',
      perfilId: 1,
      produtos: [
        {
          nome: 'Carne',
          codigo: '123',
          quantidade: 1,
          unidade: 'kg',
          preco_unitario: 50.00,
          preco_total: 50.00
        }
      ]
    };

    const id = await addGasto(novoGasto);
    const gasto = await getGastoById(id);

    expect(gasto).not.toBeNull();
    expect(gasto.apelido).toBe('Açougue');
    expect(gasto.produtos).toHaveLength(1);
    expect(gasto.produtos[0].nome).toBe('Carne');
  });

  it('deve excluir um gasto', async () => {
    const novoGasto = {
      data: '2026-04-20',
      apelido: 'Padaria',
      categoria: 'Alimentação',
      total: 10.00,
      tipoCusto: 'Variável',
      perfilId: 1,
      produtos: []
    };

    const id = await addGasto(novoGasto);
    await deleteGasto(id);

    const gastos = await getGastos();
    expect(gastos).toHaveLength(0);
  });
});
