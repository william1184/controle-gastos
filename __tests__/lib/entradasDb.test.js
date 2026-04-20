import { addConta, getContas } from '@/lib/contaDb';
import { getDb, initDb } from '@/lib/db';
import { setActiveEntidade } from '@/lib/entidadeDb';
import { addEntrada, clearEntradas, getEntradaById, getEntradas, updateEntrada } from '@/lib/entradasDb';
import { setActiveUsuario } from '@/lib/usuarioDb';

describe('entradasDb Operations', () => {
  let defaultAccountId;

  beforeAll(async () => {
    // Initialize the in-memory database
    await initDb();
    const db = getDb();
    const now = new Date().toISOString();

    // Ensure active entity and user are set
    setActiveEntidade(1);
    setActiveUsuario(1);

    // Ensure categories exist for tests
    try {
      db.run("INSERT OR IGNORE INTO categoria (nome, tipo, created_at) VALUES ('Freelance', 'entrada', ?)", [now]);
      db.run("INSERT OR IGNORE INTO categoria (nome, tipo, created_at) VALUES ('Investimentos', 'entrada', ?)", [now]);
      db.run("INSERT OR IGNORE INTO categoria (nome, tipo, created_at) VALUES ('Salário', 'entrada', ?)", [now]);
      db.run("INSERT OR IGNORE INTO categoria (nome, tipo, created_at) VALUES ('Rendimentos', 'entrada', ?)", [now]);
    } catch (e) {
      // Might already exist
    }

    const contas = await getContas();
    if (contas.length > 0) {
      defaultAccountId = contas[0].id;
    } else {
      // Seed might have run, but let's be sure
      await addConta({ nome: 'Conta Teste', tipo: 'banco', saldo_inicial: 1000, entidade_id: 1 });
      const newContas = await getContas();
      defaultAccountId = newContas[0].id;
    }
  });

  beforeEach(async () => {
    // Clear data before each test to ensure a clean slate
    await clearEntradas();
  });

  it('deve adicionar e recuperar uma entrada com conta', async () => {
    const novaEntrada = {
      data: '2026-04-20',
      descricao: 'Salário Abril',
      categoria: 'Salário',
      valor: 5000.00,
      contaId: defaultAccountId
    };

    const id = await addEntrada({ ...novaEntrada, usuarioId: 1 });
    expect(id).toBeDefined();

    const entradas = await getEntradas();
    expect(entradas).toHaveLength(1);
    expect(entradas[0].descricao).toBe('Salário Abril');
    expect(entradas[0].contaId).toBe(defaultAccountId);
    expect(entradas[0].contaNome).toBeDefined();
  });

  it('deve filtrar entradas por categoria', async () => {
    await addEntrada({ data: '2026-04-20', descricao: 'Job 1', categoria: 'Freelance', valor: 100, contaId: defaultAccountId, usuarioId: 1 });
    await addEntrada({ data: '2026-04-21', descricao: 'Job 2', categoria: 'Investimentos', valor: 200, contaId: defaultAccountId, usuarioId: 1 });

    const filtradas = await getEntradas({ categoria: 'Freelance' });
    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].descricao).toBe('Job 1');
  });

  it('deve filtrar entradas por conta', async () => {
    // Adicionar outra conta
    await addConta({ nome: 'Outra Conta', tipo: 'carteira', saldo_inicial: 0, entidade_id: 1 });
    const contas = await getContas();
    const outraContaId = contas.find(c => c.nome === 'Outra Conta').id;

    await addEntrada({ data: '2026-04-20', descricao: 'Entrada 1', categoria: 'Salário', valor: 100, contaId: defaultAccountId, usuarioId: 1 });
    await addEntrada({ data: '2026-04-21', descricao: 'Entrada 2', categoria: 'Salário', valor: 200, contaId: outraContaId, usuarioId: 1 });

    const filtradas = await getEntradas({ accountId: outraContaId });
    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].descricao).toBe('Entrada 2');
  });

  it('deve filtrar entradas por intervalo de data', async () => {
    await addEntrada({ data: '2026-04-01', descricao: 'Entrada Antiga', categoria: 'Salário', valor: 100, contaId: defaultAccountId, usuarioId: 1 });
    await addEntrada({ data: '2026-04-15', descricao: 'Entrada Meio', categoria: 'Salário', valor: 100, contaId: defaultAccountId, usuarioId: 1 });
    await addEntrada({ data: '2026-04-30', descricao: 'Entrada Nova', categoria: 'Salário', valor: 100, contaId: defaultAccountId, usuarioId: 1 });

    const filtradas = await getEntradas({ startDate: '2026-04-10', endDate: '2026-04-20' });
    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].descricao).toBe('Entrada Meio');
  });

  it('deve criar e vincular uma recorrência', async () => {
    const novaEntrada = {
      data: '2026-04-20',
      descricao: 'Aluguel Recebido',
      categoria: 'Rendimentos',
      valor: 1200.00,
      contaId: defaultAccountId,
      recorrencia: { frequencia: 'mensal' }
    };

    const id = await addEntrada({ ...novaEntrada, usuarioId: 1 });
    const entrada = await getEntradaById(id);

    expect(entrada.recorrenciaId).not.toBeNull();
  });

  it('deve atualizar uma entrada e sua conta', async () => {
    const id = await addEntrada({ data: '2026-04-20', descricao: 'Original', categoria: 'Salário', valor: 100, contaId: defaultAccountId, usuarioId: 1 });

    await addConta({ nome: 'Conta Update', tipo: 'banco', saldo_inicial: 0, entidade_id: 1 });
    const contas = await getContas();
    const updateContaId = contas.find(c => c.nome === 'Conta Update').id;

    await updateEntrada(id, { data: '2026-04-21', descricao: 'Editado', categoria: 'Freelance', valor: 200, contaId: updateContaId });

    const atualizada = await getEntradaById(id);
    expect(atualizada.descricao).toBe('Editado');
    expect(atualizada.valor).toBe(200);
    expect(atualizada.contaId).toBe(updateContaId);
  });
});
