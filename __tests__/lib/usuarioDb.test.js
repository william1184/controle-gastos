import { initDb } from '@/lib/db';
import { addUsuario, getUsuarios, updateUsuario, deleteUsuario, setActiveUsuario, getActiveUsuario } from '@/lib/usuarioDb';
import { addEntidade } from '@/lib/entidadeDb';

describe('usuarioDb Operations', () => {
  let entidadeId;

  beforeAll(async () => {
    await initDb();
    entidadeId = await addEntidade({ nome: 'Entidade Teste', is_contexto_pessoal: true });
  });

  it('deve adicionar e recuperar usuários de uma entidade', async () => {
    const nome = 'João';
    const id = await addUsuario({ nome, entidade_id: entidadeId });
    expect(id).toBeDefined();

    const usuarios = await getUsuarios(entidadeId);
    const joao = usuarios.find(u => u.id === id);
    expect(joao).toBeDefined();
    expect(joao.nome).toBe(nome);
  });

  it('deve atualizar um usuário', async () => {
    const id = await addUsuario({ nome: 'Maria', entidade_id: entidadeId });
    await updateUsuario(id, { nome: 'Maria Silva' });

    const usuarios = await getUsuarios(entidadeId);
    const maria = usuarios.find(u => u.id === id);
    expect(maria.nome).toBe('Maria Silva');
  });

  it('deve "deletar" (soft delete) um usuário', async () => {
    const id = await addUsuario({ nome: 'Remover', entidade_id: entidadeId });
    await deleteUsuario(id);

    const usuarios = await getUsuarios(entidadeId);
    const removido = usuarios.find(u => u.id === id);
    expect(removido).toBeUndefined();
  });

  it('deve gerenciar o usuário ativo', async () => {
    const id = await addUsuario({ nome: 'Ativo', entidade_id: entidadeId });
    setActiveUsuario(id);
    
    expect(localStorage.getItem('activeUsuarioId')).toBe(id.toString());
    
    const active = await getActiveUsuario();
    expect(active.id).toBe(id);
    expect(active.nome).toBe('Ativo');
  });
});
