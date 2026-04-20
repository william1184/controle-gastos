import { initDb } from '@/lib/db';
import { addEntidade, getEntidades, getActiveEntidade, setActiveEntidade, updateEntidade } from '@/lib/entidadeDb';

describe('entidadeDb Operations', () => {
  beforeAll(async () => {
    await initDb();
  });

  it('deve adicionar e recuperar entidades', async () => {
    const nome = 'Família Silva';
    const id = await addEntidade({ nome, is_contexto_pessoal: true });
    expect(id).toBeDefined();

    const entidades = await getEntidades();
    const silva = entidades.find(e => e.id === id);
    expect(silva).toBeDefined();
    expect(silva.nome).toBe(nome);
    expect(silva.is_contexto_pessoal).toBe(true);
  });

  it('deve atualizar o nome de uma entidade', async () => {
    const id = await addEntidade({ nome: 'Original', is_contexto_pessoal: false });
    await updateEntidade(id, { nome: 'Atualizado', is_contexto_pessoal: true });

    const entidades = await getEntidades();
    const atualizada = entidades.find(e => e.id === id);
    expect(atualizada.nome).toBe('Atualizado');
    expect(atualizada.is_contexto_pessoal).toBe(true);
  });

  it('deve gerenciar a entidade ativa no localStorage', async () => {
    // Note: In Jest environment, localStorage might need a mock if not available,
    // but typically it's available in jsdom or can be mocked.
    const id = 99;
    setActiveEntidade(id);
    
    // We can't easily test getActiveEntidade without a real DB state for id 99,
    // but we can check if it calls the right things.
    expect(localStorage.getItem('activeEntidadeId')).toBe('99');
  });
});
