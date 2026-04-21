import { initDb } from '@/lib/db';
import { getConfig, setConfig } from '@/lib/configuracaoDb';
import { addUsuario } from '@/lib/usuarioDb';
import { addEntidade } from '@/lib/entidadeDb';

describe('configuracaoDb Operations', () => {
  let userId;

  beforeAll(async () => {
    await initDb();
    const entidadeId = await addEntidade({ nome: 'Entidade Config', is_contexto_pessoal: true });
    userId = await addUsuario({ nome: 'User Config', entidade_id: entidadeId });
  });

  it('deve salvar e recuperar configuração global', async () => {
    const chave = 'app_theme';
    const valor = 'dark';
    
    await setConfig(chave, valor);
    const recuperado = await getConfig(chave);
    
    expect(recuperado).toBe(valor);
  });

  it('deve salvar e recuperar configuração de usuário', async () => {
    const chave = 'user_pref';
    const valor = { notifications: true, language: 'pt-BR' };
    
    await setConfig(chave, valor, userId);
    const recuperado = await getConfig(chave, userId);
    
    expect(recuperado).toEqual(valor);
  });

  it('deve atualizar configuração existente', async () => {
    const chave = 'app_theme';
    await setConfig(chave, 'light');
    const recuperado = await getConfig(chave);
    expect(recuperado).toBe('light');
  });

  it('deve retornar null para chave inexistente', async () => {
    const recuperado = await getConfig('non_existent_key');
    expect(recuperado).toBeNull();
  });
});
