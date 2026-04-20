import { getItens, updateItem, deleteItem } from '@/lib/itensDb';
import { addGasto } from '@/lib/gastosDb';
import { initDb } from '@/lib/db';
import { addEntidade, setActiveEntidade } from '@/lib/entidadeDb';
import { addUsuario, setActiveUsuario } from '@/lib/usuarioDb';

describe('itensDb Service', () => {
  let entidadeId;
  let usuarioId;

  beforeAll(async () => {
    await initDb();
    
    // Setup test entity and user
    entidadeId = await addEntidade({ nome: 'Entidade Teste Itens' });
    setActiveEntidade(entidadeId);
    
    usuarioId = await addUsuario({ nome: 'User Teste Itens', entidade_id: entidadeId });
    await setActiveUsuario(usuarioId);
  });

  test('should retrieve items from transactions in the current entity', async () => {
    // Add a transaction with items
    const gasto = {
      data: '2026-04-20',
      apelido: 'Compra Teste',
      categoria: 'Alimentação',
      total: 50.00,
      usuarioId: usuarioId,
      produtos: [
        { nome: 'Arroz 5kg', quantidade: 1, unidade: 'un', preco_unitario: 30.00, preco_total: 30.00 },
        { nome: 'Feijão 1kg', quantidade: 2, unidade: 'un', preco_unitario: 10.00, preco_total: 20.00 }
      ]
    };
    
    await addGasto(gasto);
    
    const items = await getItens();
    expect(items.length).toBeGreaterThanOrEqual(2);
    
    const itemNames = items.map(i => i.nome);
    expect(itemNames).toContain('Arroz 5kg');
    expect(itemNames).toContain('Feijão 1kg');
  });

  test('should filter items by name', async () => {
    const items = await getItens({ nome: 'Arroz' });
    expect(items.every(i => i.nome.includes('Arroz'))).toBe(true);
    expect(items.length).toBe(1);
  });

  test('should delete an item', async () => {
    const allItems = await getItens();
    const itemToDelete = allItems[0];
    
    await deleteItem(itemToDelete.id);
    
    const remainingItems = await getItens();
    expect(remainingItems.find(i => i.id === itemToDelete.id)).toBeUndefined();
  });
});
