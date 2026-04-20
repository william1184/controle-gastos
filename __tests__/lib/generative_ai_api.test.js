// Mock GoogleGenerativeAI
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn()
      })
    }))
  };
});

const GenerativeLanguageApi = require('../../src/lib/generative_ai_api').default;
const { GoogleGenerativeAI } = require('@google/generative-ai');

describe('GenerativeLanguageApi', () => {
  let api;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    api = new GenerativeLanguageApi(mockApiKey);
    jest.clearAllMocks();
  });

  test('suggestCategories should format prompt correctly with tipo_custo', async () => {
    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify([
          { index: 0, categoria_sugerida: 'Alimentação', tipo_custo_sugerido: 'Variável', motivo: 'Teste' }
        ])
      }
    });

    const mockGenAI = new GoogleGenerativeAI();
    mockGenAI.getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });
    api.genAI = mockGenAI;

    const saidas = [{ apelido: 'Supermercado', categoria: 'Outros', total: 100, tipoCusto: 'Variável' }];
    const categorias = ['Alimentação', 'Lazer'];

    const result = await api.suggestCategories(saidas, categorias);

    expect(mockGenerateContent).toHaveBeenCalled();
    const prompt = mockGenerateContent.mock.calls[0][0];
    expect(prompt).toContain('Tipos de custo: \'Fixo\'');
    expect(prompt).toContain('tipo_custo_sugerido');
    expect(result).toHaveLength(1);
    expect(result[0].categoria_sugerida).toBe('Alimentação');
    expect(result[0].tipo_custo_sugerido).toBe('Variável');
  });

  test('suggestCategoriesEntradas should format prompt correctly', async () => {
    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify([
          { index: 0, categoria_sugerida: 'Salário', motivo: 'Teste' }
        ])
      }
    });

    const mockGenAI = new GoogleGenerativeAI();
    mockGenAI.getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });
    api.genAI = mockGenAI;

    const entradas = [{ descricao: 'Pagamento Empresa', categoria: 'Outros', valor: 5000 }];
    const categorias = ['Salário', 'Freelance'];

    const result = await api.suggestCategoriesEntradas(entradas, categorias);

    expect(mockGenerateContent).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].categoria_sugerida).toBe('Salário');
  });

  test('suggestCategories should handle empty suggestions', async () => {
    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => '[]'
      }
    });

    const mockGenAI = new GoogleGenerativeAI();
    mockGenAI.getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });
    api.genAI = mockGenAI;

    const result = await api.suggestCategories([], []);
    expect(result).toEqual([]);
  });
});
