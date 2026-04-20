import { initDb, getDb } from '@/lib/db';
import { addRenda, getRendas, clearRendas, getRendaById, updateRenda, deleteRenda } from '@/lib/rendasDb';
import { addConta, getContas } from '@/lib/contaDb';
import { setActiveEntidade } from '@/lib/entidadeDb';
import { setActiveUsuario } from '@/lib/usuarioDb';

describe('rendasDb Operations', () => {
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
    await clearRendas();
  });

  it('deve adicionar e recuperar uma renda com conta', async () => {
    const novaRenda = {
      data: '2026-04-20',
      descricao: 'Salário Abril',
      categoria: 'Salário',
      valor: 5000.00,
      contaId: defaultAccountId
    };

    const id = await addRenda({ ...novaRenda, usuarioId: 1 });
    expect(id).toBeDefined();

    const rendas = await getRendas();
    expect(rendas).toHaveLength(1);
    expect(rendas[0].descricao).toBe('Salário Abril');
    expect(rendas[0].contaId).toBe(defaultAccountId);
    expect(rendas[0].contaNome).toBeDefined();
  });

  it('deve filtrar rendas por categoria', async () => {
    await addRenda({ data: '2026-04-20', descricao: 'Job 1', categoria: 'Freelance', valor: 100, contaId: defaultAccountId, usuarioId: 1 });
    await addRenda({ data: '2026-04-21', descricao: 'Job 2', categoria: 'Investimentos', valor: 200, contaId: defaultAccountId, usuarioId: 1 });

    const filtradas = await getRendas({ categoria: 'Freelance' });
    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].descricao).toBe('Job 1');
  });

  it('deve filtrar rendas por conta', async () => {
    // Adicionar outra conta
    await addConta({ nome: 'Outra Conta', tipo: 'carteira', saldo_inicial: 0, entidade_id: 1 });
    const contas = await getContas();
    const outraContaId = contas.find(c => c.nome === 'Outra Conta').id;

    await addRenda({ data: '2026-04-20', descricao: 'Renda 1', categoria: 'Salário', valor: 100, contaId: defaultAccountId, usuarioId: 1 });
    await addRenda({ data: '2026-04-21', descricao: 'Renda 2', categoria: 'Salário', valor: 200, contaId: outraContaId, usuarioId: 1 });

    const filtradas = await getRendas({ accountId: outraContaId });
    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].descricao).toBe('Renda 2');
  });

  it('deve filtrar rendas por intervalo de data', async () => {
    await addRenda({ data: '2026-04-01', descricao: 'Renda Antiga', categoria: 'Salário', valor: 100, contaId: defaultAccountId, usuarioId: 1 });
    await addRenda({ data: '2026-04-15', descricao: 'Renda Meio', categoria: 'Salário', valor: 100, contaId: defaultAccountId, usuarioId: 1 });
    await addRenda({ data: '2026-04-30', descricao: 'Renda Nova', categoria: 'Salário', valor: 100, contaId: defaultAccountId, usuarioId: 1 });

    const filtradas = await getRendas({ startDate: '2026-04-10', endDate: '2026-04-20' });
    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].descricao).toBe('Renda Meio');
  });

  it('deve criar e vincular uma recorrência', async () => {
    const novaRenda = {
      data: '2026-04-20',
      descricao: 'Aluguel Recebido',
      categoria: 'Rendimentos',
      valor: 1200.00,
      contaId: defaultAccountId,
      recorrencia: { frequencia: 'mensal' }
    };

    const id = await addRenda({ ...novaRenda, usuarioId: 1 });
    const renda = await getRendaById(id);

    expect(renda.recorrenciaId).not.toBeNull();
  });

  it('deve atualizar uma renda e sua conta', async () => {
    const id = await addRenda({ data: '2026-04-20', descricao: 'Original', categoria: 'Salário', valor: 100, contaId: defaultAccountId, usuarioId: 1 });
    
    await addConta({ nome: 'Conta Update', tipo: 'banco', saldo_inicial: 0, entidade_id: 1 });
    const contas = await getContas();
    const updateContaId = contas.find(c => c.nome === 'Conta Update').id;

    await updateRenda(id, { data: '2026-04-21', descricao: 'Editado', categoria: 'Freelance', valor: 200, contaId: updateContaId });
    
    const atualizada = await getRendaById(id);
    expect(atualizada.descricao).toBe('Editado');
    expect(atualizada.valor).toBe(200);
    expect(atualizada.contaId).toBe(updateContaId);
  });
});
