import { initDb } from '@/lib/db';
import { orcamentoDb } from '@/lib/orcamentoDb';
import { addEntidade } from '@/lib/entidadeDb';
import { addCategoria } from '@/lib/categoriaDb';

describe('orcamentoDb Operations', () => {
  let entidadeId;

  beforeAll(async () => {
    await initDb();
    entidadeId = await addEntidade({ nome: 'Entidade Orcamento', is_contexto_pessoal: true });
  });

  it('deve buscar ou criar um orçamento', async () => {
    const mes = 5;
    const ano = 2024;
    const orcamento = await orcamentoDb.getOrCreateOrcamento(entidadeId, mes, ano);
    
    expect(orcamento).toBeDefined();
    expect(orcamento.id).toBeDefined();
    expect(orcamento.mes).toBe(mes);
    expect(orcamento.ano).toBe(ano);

    // Buscar o mesmo orçamento
    const mesmoOrcamento = await orcamentoDb.getOrCreateOrcamento(entidadeId, mes, ano);
    expect(mesmoOrcamento.id).toBe(orcamento.id);
  });

  it('deve gerenciar limites por categoria', async () => {
    const mes = 5;
    const ano = 2024;
    const orcamento = await orcamentoDb.getOrCreateOrcamento(entidadeId, mes, ano);
    
    // Pegar uma categoria existente (semeada pelo initDb) ou adicionar uma
    await addCategoria({ nome: 'Lazer Teste', tipo: 'saida' });
    const limites = await orcamentoDb.getLimitesPorCategoria(orcamento.id);
    const catLazer = limites.find(l => l.categoria_nome === 'Lazer Teste');
    
    expect(catLazer).toBeDefined();
    
    const novoLimite = 500;
    await orcamentoDb.saveLimiteCategoria(orcamento.id, catLazer.categoria_id, novoLimite);
    
    const limitesAtualizados = await orcamentoDb.getLimitesPorCategoria(orcamento.id);
    const catLazerAtualizada = limitesAtualizados.find(l => l.categoria_id === catLazer.categoria_id);
    expect(catLazerAtualizada.valor_limite).toBe(novoLimite);
  });

  it('deve calcular o resumo do orçamento', async () => {
    const mes = 5;
    const ano = 2024;
    const resumo = await orcamentoDb.getResumoOrcamento(entidadeId, mes, ano);
    
    expect(resumo).toBeDefined();
    expect(resumo.totalPlanejadoSaida).toBeGreaterThanOrEqual(0);
    expect(resumo.totalRealizadoSaida).toBe(0); // Sem transações ainda
  });
});
