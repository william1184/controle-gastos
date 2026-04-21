import { initDb } from '@/lib/db';
import { getCategorias, addCategoria, updateCategoria, deleteCategoria } from '@/lib/categoriaDb';

describe('categoriaDb Operations', () => {
  beforeAll(async () => {
    await initDb();
  });

  it('deve adicionar e recuperar categorias', async () => {
    const novaCat = { nome: 'Teste Categoria', tipo: 'saida' };
    await addCategoria(novaCat);

    const categorias = await getCategorias('saida');
    const encontrada = categorias.find(c => c.nome === 'Teste Categoria');
    expect(encontrada).toBeDefined();
    expect(encontrada.tipo).toBe('saida');
  });

  it('deve atualizar uma categoria', async () => {
    const categorias = await getCategorias('saida');
    const cat = categorias[0];
    const novoNome = 'Nome Atualizado';
    
    await updateCategoria(cat.id, novoNome);
    
    const categoriasAtualizadas = await getCategorias('saida');
    const catAtualizada = categoriasAtualizadas.find(c => c.id === cat.id);
    expect(catAtualizada.nome).toBe(novoNome);
  });

  it('deve deletar (soft delete) uma categoria', async () => {
    const categorias = await getCategorias('saida');
    const cat = categorias.find(c => c.nome === 'Teste Categoria');
    
    await deleteCategoria(cat.id);
    
    const categoriasRestantes = await getCategorias('saida');
    const catDeletada = categoriasRestantes.find(c => c.id === cat.id);
    expect(catDeletada).toBeUndefined();
  });
});
