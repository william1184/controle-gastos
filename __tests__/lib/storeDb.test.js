import { initDb } from '@/lib/db';
import { getCategoriasEntradas, getCategoriasSaidas, setCategoriasEntradas, setCategoriasSaidas, setConfiguracoes } from '@/lib/storeDb';

describe('storeDb Category Management', () => {
  beforeEach(async () => {
    await initDb();
    // Reset configurations before each test
    await setConfiguracoes({});
  });

  test('should return default expense categories if none are set', async () => {
    const cats = await getCategoriasSaidas();
    expect(cats).toContain('Alimentação');
    expect(cats).toContain('Transporte');
    expect(cats.length).toBeGreaterThan(0);
  });

  test('should save and retrieve custom expense categories', async () => {
    const customCats = ['Lanches', 'Games', 'Viagens'];
    await setCategoriasSaidas(customCats);
    const retrieved = await getCategoriasSaidas();
    expect(retrieved).toEqual(customCats);
  });

  test('should return default income categories if none are set', async () => {
    const cats = await getCategoriasEntradas();
    expect(cats).toContain('Salário');
    expect(cats).toContain('Freelance');
    expect(cats.length).toBeGreaterThan(0);
  });

  test('should save and retrieve custom income categories', async () => {
    const customCats = ['Dividendos', 'Aluguel', 'Prêmios'];
    await setCategoriasEntradas(customCats);
    const retrieved = await getCategoriasEntradas();
    expect(retrieved).toEqual(customCats);
  });

  test('should handle object-style categories gracefully (legacy support)', async () => {
    const legacyConfig = {
      categoriasSaidas: [{ nome: 'Legacy Saida' }],
      categoriasEntradas: [{ nome: 'Legacy Entrada' }]
    };
    await setConfiguracoes(legacyConfig);

    const saidas = await getCategoriasSaidas();
    const entradas = await getCategoriasEntradas();

    expect(saidas).toEqual(['Legacy Saida']);
    expect(entradas).toEqual(['Legacy Entrada']);
  });
});
