import { getCategoriasGastos, setCategoriasGastos, getCategoriasRendas, setCategoriasRendas, getConfiguracoes, setConfiguracoes } from '@/lib/storeDb';
import { initDb } from '@/lib/db';

describe('storeDb Category Management', () => {
  beforeEach(async () => {
    await initDb();
    // Reset configurations before each test
    await setConfiguracoes({});
  });

  test('should return default expense categories if none are set', async () => {
    const cats = await getCategoriasGastos();
    expect(cats).toContain('Alimentação');
    expect(cats).toContain('Transporte');
    expect(cats.length).toBeGreaterThan(0);
  });

  test('should save and retrieve custom expense categories', async () => {
    const customCats = ['Lanches', 'Games', 'Viagens'];
    await setCategoriasGastos(customCats);
    const retrieved = await getCategoriasGastos();
    expect(retrieved).toEqual(customCats);
  });

  test('should return default income categories if none are set', async () => {
    const cats = await getCategoriasRendas();
    expect(cats).toContain('Salário');
    expect(cats).toContain('Freelance');
    expect(cats.length).toBeGreaterThan(0);
  });

  test('should save and retrieve custom income categories', async () => {
    const customCats = ['Dividendos', 'Aluguel', 'Prêmios'];
    await setCategoriasRendas(customCats);
    const retrieved = await getCategoriasRendas();
    expect(retrieved).toEqual(customCats);
  });

  test('should handle object-style categories gracefully (legacy support)', async () => {
    const legacyConfig = {
      categoriasGastos: [{ nome: 'Legacy Gasto' }],
      categoriasRendas: [{ nome: 'Legacy Renda' }]
    };
    await setConfiguracoes(legacyConfig);
    
    const gastos = await getCategoriasGastos();
    const rendas = await getCategoriasRendas();
    
    expect(gastos).toEqual(['Legacy Gasto']);
    expect(rendas).toEqual(['Legacy Renda']);
  });
});
