import { parseCsvLine, parseCsvDate, parseCsvCurrency, detectCsvColumns } from '@/lib/csvUtils';

describe('csvUtils', () => {
  describe('parseCsvLine', () => {
    it('deve parsear uma linha simples com vírgula', () => {
      const line = 'valor1,valor2,valor3';
      expect(parseCsvLine(line, ',')).toEqual(['valor1', 'valor2', 'valor3']);
    });

    it('deve lidar com campos entre aspas', () => {
      const line = 'valor1,"valor, com virgula",valor3';
      expect(parseCsvLine(line, ',')).toEqual(['valor1', 'valor, com virgula', 'valor3']);
    });

    it('deve lidar com aspas duplas dentro de campos', () => {
      const line = 'valor1,"valor ""com aspas""",valor3';
      expect(parseCsvLine(line, ',')).toEqual(['valor1', 'valor "com aspas"', 'valor3']);
    });
  });

  describe('parseCsvDate', () => {
    it('deve parsear data no formato DD/MM/YYYY', () => {
      expect(parseCsvDate('20/04/2026')).toBe('2026-04-20');
    });

    it('deve parsear data no formato YYYY-MM-DD', () => {
      expect(parseCsvDate('2026-04-20')).toBe('2026-04-20');
    });

    it('deve retornar null para formato inválido', () => {
      expect(parseCsvDate('2026-20-04')).toBeNull();
      expect(parseCsvDate('abc')).toBeNull();
    });
  });

  describe('parseCsvCurrency', () => {
    it('deve parsear valores simples', () => {
      expect(parseCsvCurrency('123.45')).toBe(123.45);
    });

    it('deve lidar com formato brasileiro (ponto como milhar, vírgula como decimal)', () => {
      expect(parseCsvCurrency('1.234,56')).toBe(1234.56);
      expect(parseCsvCurrency('1234,56')).toBe(1234.56);
    });

    it('deve ignorar prefixos monetários', () => {
      expect(parseCsvCurrency('R$ 1.234,56')).toBe(1234.56);
    });

    it('deve retornar null para valores inválidos', () => {
      expect(parseCsvCurrency('abc')).toBeNull();
      expect(parseCsvCurrency('')).toBeNull();
    });
  });

  describe('detectCsvColumns', () => {
    it('deve detectar colunas baseado nos headers', () => {
      const headers = ['Data do Lançamento', 'Valor da Transação', 'Descrição'];
      const dataRows = [['20/04/2026', '100,00', 'Compra Teste']];
      const result = detectCsvColumns(headers, dataRows);
      expect(result.dateIdx).toBe(0);
      expect(result.valIdx).toBe(1);
      expect(result.descIdx).toBe(2);
    });

    it('deve tentar adivinhar se os headers não forem claros', () => {
      const headers = ['Col1', 'Col2', 'Col3'];
      const dataRows = [
        ['20/04/2026', '100,00', 'Descrição longa aqui'],
        ['21/04/2026', '50,00', 'Outra descrição']
      ];
      const result = detectCsvColumns(headers, dataRows);
      expect(result.dateIdx).toBe(0);
      expect(result.valIdx).toBe(1);
      expect(result.descIdx).toBe(2);
    });
  });
});
