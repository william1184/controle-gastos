import { initDb } from '@/lib/db';
import { getContas, addConta, updateConta, deleteConta } from '@/lib/contaDb';
import { addEntidade } from '@/lib/entidadeDb';

describe('contaDb Operations', () => {
  let entidadeId;

  beforeAll(async () => {
    await initDb();
    entidadeId = await addEntidade({ nome: 'Entidade Teste', is_contexto_pessoal: true });
  });

  it('deve adicionar e recuperar contas', async () => {
    const novaConta = { 
      nome: 'Banco Teste', 
      tipo: 'banco', 
      saldo_inicial: 1000, 
      entidade_id: entidadeId 
    };
    await addConta(novaConta);

    const contas = await getContas(entidadeId);
    const encontrada = contas.find(c => c.nome === 'Banco Teste');
    expect(encontrada).toBeDefined();
    expect(encontrada.tipo).toBe('banco');
    expect(encontrada.saldo_inicial).toBe(1000);
  });

  it('deve atualizar uma conta', async () => {
    const contas = await getContas(entidadeId);
    const conta = contas.find(c => c.nome === 'Banco Teste');
    const dadosAtualizados = { 
      nome: 'Banco Atualizado', 
      tipo: 'credito', 
      saldo_inicial: 500 
    };
    
    await updateConta(conta.id, dadosAtualizados);
    
    const contasAtualizadas = await getContas(entidadeId);
    const contaAtualizada = contasAtualizadas.find(c => c.id === conta.id);
    expect(contaAtualizada.nome).toBe('Banco Atualizado');
    expect(contaAtualizada.tipo).toBe('credito');
    expect(contaAtualizada.saldo_inicial).toBe(500);
  });

  it('deve deletar (soft delete) uma conta', async () => {
    const contas = await getContas(entidadeId);
    const conta = contas.find(c => c.nome === 'Banco Atualizado');
    
    await deleteConta(conta.id);
    
    const contasRestantes = await getContas(entidadeId);
    const contaDeletada = contasRestantes.find(c => c.id === conta.id);
    expect(contaDeletada).toBeUndefined();
  });
});
