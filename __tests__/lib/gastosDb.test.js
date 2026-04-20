import { initDb, getDb } from '@/lib/db';
import { addGasto, getGastos, clearGastos, getGastoById, deleteGasto, updateGasto } from '@/lib/gastosDb';
import { addConta, getContas } from '@/lib/contaDb';
import { setActiveEntidade } from '@/lib/entidadeDb';
import { setActiveUsuario } from '@/lib/usuarioDb';

describe('gastosDb Operations', () => {
  let defaultAccountId;
  let defaultUsuarioId = 1;

  beforeAll(async () => {
    // Initialize the in-memory database
    await initDb();
    const db = getDb();
    const now = new Date().toISOString();
    
    // Ensure active entity is set for tests
    setActiveEntidade(1);
    setActiveUsuario(1);

    // Ensure categories exist for tests
    try {
      db.run("INSERT OR IGNORE INTO categoria (nome, tipo, created_at) VALUES ('Supermercado', 'saida', ?)", [now]);
      db.run("INSERT OR IGNORE INTO categoria (nome, tipo, created_at) VALUES ('Farmácia', 'saida', ?)", [now]);
      db.run("INSERT OR IGNORE INTO categoria (nome, tipo, created_at) VALUES ('Alimentação', 'saida', ?)", [now]);
      db.run("INSERT OR IGNORE INTO categoria (nome, tipo, created_at) VALUES ('Moradia', 'saida', ?)", [now]);
      db.run("INSERT OR IGNORE INTO categoria (nome, tipo, created_at) VALUES ('Contas', 'saida', ?)", [now]);
      db.run("INSERT OR IGNORE INTO categoria (nome, tipo, created_at) VALUES ('Lazer', 'saida', ?)", [now]);
    } catch (e) {}

    const contas = await getContas();
    if (contas.length > 0) {
      defaultAccountId = contas[0].id;
    } else {
      await addConta({ nome: 'Conta Gastos', tipo: 'banco', saldo_inicial: 1000, entidade_id: 1 });
      const newContas = await getContas();
      defaultAccountId = newContas[0].id;
    }
  });

  beforeEach(async () => {
    // Clear data before each test to ensure a clean slate
    await clearGastos();
  });

  it('deve adicionar e recuperar um gasto com conta e tipo_custo', async () => {
    const novoGasto = {
      data: '2026-04-20',
      apelido: 'Mercado',
      categoria: 'Alimentação',
      total: 150.50,
      tipoCusto: 'Variável',
      contaId: defaultAccountId,
      produtos: []
    };

    const id = await addGasto({ ...novoGasto, usuarioId: 1 });
    expect(id).toBeDefined();

    const gastos = await getGastos();
    expect(gastos).toHaveLength(1);
    expect(gastos[0].apelido).toBe('Mercado');
    expect(gastos[0].tipoCusto).toBe('Variável');
    expect(gastos[0].contaId).toBe(defaultAccountId);
    expect(gastos[0].contaNome).toBeDefined();
  });

  it('deve garantir que sempre existe pelo menos um item na transação', async () => {
    const novoGasto = {
      data: '2026-04-20',
      apelido: 'Lanche Rápido',
      categoria: 'Alimentação',
      total: 35.00,
      contaId: defaultAccountId,
      produtos: [] // Vazio
    };

    const id = await addGasto({ ...novoGasto, usuarioId: 1 });
    const gasto = await getGastoById(id);

    expect(gasto.produtos).toHaveLength(1);
    expect(gasto.produtos[0].nome).toBe('Lanche Rápido');
    expect(gasto.produtos[0].preco_total).toBe(35.00);
  });

  it('deve filtrar gastos por múltiplos critérios', async () => {
    await addGasto({ data: '2026-04-01', apelido: 'Aluguel', categoria: 'Moradia', total: 1000, tipoCusto: 'Fixo', contaId: defaultAccountId, usuarioId: 1 });
    await addGasto({ data: '2026-04-15', apelido: 'Mercado', categoria: 'Alimentação', total: 200, tipoCusto: 'Variável', contaId: defaultAccountId, usuarioId: 1 });

    // Filtro por tipoCusto
    const fixos = await getGastos({ tipoCusto: 'Fixo' });
    expect(fixos).toHaveLength(1);
    expect(fixos[0].apelido).toBe('Aluguel');

    // Filtro por categoria
    const alimentacao = await getGastos({ categoria: 'Alimentação' });
    expect(alimentacao).toHaveLength(1);
    expect(alimentacao[0].apelido).toBe('Mercado');
  });

  it('deve criar e vincular uma recorrência no gasto', async () => {
    const novoGasto = {
      data: '2026-04-20',
      apelido: 'Internet',
      categoria: 'Contas',
      total: 100.00,
      contaId: defaultAccountId,
      recorrencia: { frequencia: 'mensal' }
    };

    const id = await addGasto({ ...novoGasto, usuarioId: 1 });
    const gasto = await getGastoById(id);

    expect(gasto.recorrenciaId).not.toBeNull();
  });

  it('deve atualizar um gasto, sua conta e tipo_custo', async () => {
    const id = await addGasto({ data: '2026-04-20', apelido: 'Original', categoria: 'Alimentação', total: 100, tipoCusto: 'Variável', contaId: defaultAccountId, usuarioId: 1 });
    
    await addConta({ nome: 'Cartão de Crédito', tipo: 'cartao', saldo_inicial: 0, entidade_id: 1 });
    const contas = await getContas();
    const novaContaId = contas.find(c => c.nome === 'Cartão de Crédito').id;

    await updateGasto(id, { data: '2026-04-21', apelido: 'Editado', categoria: 'Lazer', total: 150, tipoCusto: 'Fixo', contaId: novaContaId, produtos: [] });
    
    const atualizado = await getGastoById(id);
    expect(atualizado.apelido).toBe('Editado');
    expect(atualizado.tipoCusto).toBe('Fixo');
    expect(atualizado.contaId).toBe(novaContaId);
  });

  it('deve gerar descrição automática se vazia', async () => {
    const id = await addGasto({
      data: '2026-04-20',
      apelido: '', // Vazio
      categoria: 'Alimentação',
      total: 50.00,
      contaId: defaultAccountId,
      usuarioId: 1
    });

    const gasto = await getGastoById(id);
    expect(gasto.apelido).toBe(`Transação saída ${id}`);
  });
});
